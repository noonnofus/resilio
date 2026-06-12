'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type {
  BuiltInChannel,
  ErrorCatalog,
  PresentationContext,
  PresentationDecision,
  PresentationEvaluator,
} from '@resiliojs/core';

export interface ActivePresentation<TChannel extends string = BuiltInChannel> {
  id: string;
  occurrenceId: string;
  decision: PresentationDecision<TChannel>;
  context: PresentationContext;
}

export interface PresentationRendererInput<TChannel extends string = BuiltInChannel> {
  decision: PresentationDecision<TChannel>;
  dismiss: () => void;
}

export type PresentationRenderer<TChannel extends string = BuiltInChannel> =
  | ((input: PresentationRendererInput<TChannel>) => void | Promise<void>)
  | { present(input: PresentationRendererInput<TChannel>): void | Promise<void> };

export type RendererRegistry<TChannel extends string = BuiltInChannel> = Partial<
  Record<TChannel, PresentationRenderer<TChannel>>
>;

interface PresentationContextValue<TChannel extends string = BuiltInChannel> {
  active: readonly ActivePresentation<TChannel>[];
  dismiss(id: string): void;
  dismissOccurrence(occurrenceId: string): void;
  present(input: unknown, context: PresentationContext): Promise<readonly ActivePresentation<TChannel>[] | null>;
}

const PresentationContextStore = createContext<PresentationContextValue<string> | null>(null);

export interface ResilioPresentationProviderProps<
  TCatalog extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
> {
  children: React.ReactNode;
  evaluator: PresentationEvaluator<TCatalog, TChannel>;
  renderers?: RendererRegistry<TChannel>;
}

export function ResilioPresentationProvider<
  TCatalog extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
>({
  children,
  evaluator,
  renderers,
}: ResilioPresentationProviderProps<TCatalog, TChannel>) {
  const [active, setActive] = useState<readonly ActivePresentation<TChannel>[]>([]);

  const dismiss = useCallback((id: string) => {
    setActive((current) => current.filter((presentation) => presentation.id !== id));
  }, []);

  const dismissOccurrence = useCallback((occurrenceId: string) => {
    setActive((current) =>
      current.filter((presentation) => presentation.occurrenceId !== occurrenceId),
    );
  }, []);

  const present = useCallback(
    async (input: unknown, context: PresentationContext) => {
      const result = await evaluator.evaluateUnknown(input, context);
      if (result.kind !== 'plan') {
        return null;
      }

      const presentations = result.decisions
        .filter(({ status, decision }) => status === 'dispatch' && decision.channel !== 'silent')
        .map(({ decision }, index): ActivePresentation<TChannel> => ({
          id: `${result.plan.occurrenceId}:${index}`,
          occurrenceId: result.plan.occurrenceId,
          decision,
          context,
        }));
      if (presentations.length > 0) {
        setActive((current) => [...current, ...presentations]);
      }

      for (const presentation of presentations) {
        const renderer = renderers?.[presentation.decision.channel];
        if (!renderer) continue;
        const rendererInput = {
          decision: presentation.decision,
          dismiss: () => dismiss(presentation.id),
        };
        try {
          const pending =
            typeof renderer === 'function'
              ? renderer(rendererInput)
              : renderer.present(rendererInput);
          void Promise.resolve(pending).catch(() => undefined);
        } catch {
          // Renderers are presentation side effects and must not break user flows.
        }
      }

      return presentations;
    },
    [dismiss, evaluator, renderers],
  );

  const value = useMemo(
    () => ({ active, dismiss, dismissOccurrence, present }) as PresentationContextValue<string>,
    [active, dismiss, dismissOccurrence, present],
  );

  return (
    <PresentationContextStore.Provider value={value}>
      {children}
    </PresentationContextStore.Provider>
  );
}

function usePresentationContext() {
  const context = useContext(PresentationContextStore);
  if (!context) {
    throw new Error('Presentation APIs must be used within a Resilio presentation provider.');
  }
  return context;
}

export function usePresentError() {
  return usePresentationContext().present;
}

export function useOptionalPresentError() {
  return useContext(PresentationContextStore)?.present ?? null;
}

export interface ResilioPresentationHostProps {
  children(input: {
    active: readonly ActivePresentation<string>[];
    dismiss(id: string): void;
    dismissOccurrence(occurrenceId: string): void;
  }): React.ReactNode;
}

export function ResilioPresentationHost({ children }: ResilioPresentationHostProps) {
  const { active, dismiss, dismissOccurrence } = usePresentationContext();
  return <>{children({ active, dismiss, dismissOccurrence })}</>;
}

export function useResilioInline({
  surface,
  target,
}: {
  surface: string;
  target: string;
}): ActivePresentation<string> | undefined {
  const { active } = usePresentationContext();
  for (let index = active.length - 1; index >= 0; index -= 1) {
    const presentation = active[index];
    if (
      presentation &&
      presentation.decision.channel === 'inline' &&
      presentation.context.surface === surface &&
      presentation.decision.target === target
    ) {
      return presentation;
    }
  }
  return undefined;
}
