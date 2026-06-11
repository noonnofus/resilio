# Resilio Git 및 커밋 컨벤션 가이드 (Git & Commit Conventions)

본 문서는 오픈소스 라이브러리 `Resilio` 프로젝트에서 협업 시 준수해야 할 Git 브랜치 전략, 커밋 메시지 규칙, 그리고 풀 리퀘스트(PR) 가이드라인을 정의합니다.

---

## 1. 커밋 메시지 규칙 (Commit Rules)

로고스AI(LogosAI) 표준 커밋 규격을 준수합니다. 커밋 히스토리를 명확히 추적하기 위해 아래 서식을 강제합니다.

### 📝 커밋 제목 서식
```text
<type>: <한 줄 요약>
```
* **이슈 키 사용 안 함**: 이슈 추적 시스템 연동이 불필요하므로 커밋 시작에 이슈 번호(예: `[RES-101]`)를 기입하지 않고 바로 제목을 작성합니다.
* **Conventional Commits Scope 사용 금지**: `feat(core): ...`와 같이 괄호를 사용하는 scope 표기법은 지양하고, 대신 `: ` 형태로 간결하게 타입과 요약을 구분합니다.
* **공동 저자 트레일러 금지**: AI 에이전트가 자동 생성할 수 있는 `Co-Authored-By: Codex ...` 트레일러는 로고스AI 전역 규칙상 **절대 추가하지 않습니다.**
* **언어**: 커밋 메시지 본문은 한국어로 알기 쉽게 기록하되, 기술적인 명칭(예: Zod, Policy, Engine 등)은 있는 그대로 표기합니다.

### 🏷️ 커밋 타입 (Commit Types)
| 타입 | 용도 | 예시 |
| :--- | :--- | :--- |
| `feat` | 새로운 기능 추가 | `feat: PolicyEngine 내 BoundedDedupeStore 구현` |
| `fix` | 버그 해결 | `fix: async Sink rejection 격리 조치` |
| `refactor` | 기능 변경 없는 코드 구조 개선 | `refactor: public API의 any 타입을 generics로 수정` |
| `test` | 테스트 코드 작성 및 변경 | `test: burst dedupe 및 canonical 해시 테스트 추가` |
| `docs` | 문서 수정 및 추가 | `docs: README에 Next.js 15 onRequestError 연동 가이드 보강` |
| `chore` | 빌드/의존성/CI 환경 설정 변경 | `chore: workspace devDependencies에 zod 패키지 추가` |

---

## 2. 브랜치 전략 (Branch Strategy)

Trunk-Based Development 및 GitHub Flow 전략을 혼합하여 단순하고 기민한 브랜치 생명주기를 가집니다.

### 🌿 브랜치 종류
1. **`main` 브랜치**:
   - 제품 릴리스가 가능한 가장 안정적인 상태를 유지하는 브랜치입니다.
   - `main` 브랜치로의 직접적인 push는 차단되며, 반드시 Feature 브랜치 작업 후 PR(Pull Request)을 거쳐 머지되어야 합니다.
2. **Feature 브랜치**:
   - 신규 기능 개발 또는 버그 수정을 진행하는 독립적인 작업 브랜치입니다.
   - 명명 패턴: `feat/기능요약` 또는 `fix/버그요약`
   - 예시: `feat/dedupe-store`, `fix/sink-leak`

### 🔒 `git_safety` 안전 규칙
* **AI 에이전트 행동 제약**: AI 에이전트는 사용자의 직접적인 텍스트 명령 또는 명시적인 승인(Approval)이 떨어지기 전에는 절대로 임의로 브랜치를 새로 생성하거나, 원격 리포지토리에 `push` 하거나, `PR`을 개설하는 행위를 하지 않습니다.

---

## 3. PR (Pull Request) 및 검증 규칙 (PR & Verification)

Feature 브랜치에서의 작업을 `main` 브랜치로 통합하기 전, 라이브러리의 품질을 증명하기 위해 아래 품질 게이트를 의무적으로 통과해야 합니다.

### 🛡️ CI/CD 품질 게이트
PR이 최종 승인되어 머지되기 위해 로컬 또는 CI 환경에서 아래의 4가지 검증이 100% 정상 통과해야 합니다.
```bash
# 1. 빌드 성공 확인
pnpm build

# 2. 정적 타입 체킹 성공 확인
pnpm typecheck

# 3. 전체 테스트 스위트 통과 확인
pnpm test

# 4. 예제 앱 빌드 성공 확인
pnpm --filter next-app run build
```

### 📋 리뷰 및 승인 체크리스트
* **Unexpected Exception의 Rethrow 보장**: 예상치 못한 서버 예외는 절대 클라이언트 PublicError로 직렬화하여 반환하지 않으며, 그대로 `throw`하여 Next.js 관측성 레이어에서 잡히도록 유지하였는가?
* **Next.js 제어 예외 미간섭**: `redirect()`나 `notFound()` 등 Next.js의 흐름 제어를 위한 특수 throw가 일반 exception이나 PublicError로 변환되지 않고 정상적으로 통과되는가?
* **Async Rejection 격리**: Telemetry Sink 호출 시 발생하는 비동기 Promise rejection이 사용자 프로세스의 흐름을 중단시키지 않고 격리(`Promise.resolve().catch()`)되었는가?
* **any 타입 지양**: 주요 Public API 및 context 전달 과정에서 `any`를 남발하지 않고 `Generics`와 `unknown`으로 안전하게 설계하였는가?
* **예제 앱 최신화**: 라이브러리 API가 변경되었을 때, `examples/` 내 예제 앱 소스 역시 이에 맞게 업데이트되어 빌드 및 린트에 문제가 없는가?

---

## 릴리스 버전 및 카탈로그 변경 정책 (SemVer)
에러 카탈로그(`ErrorCatalog`)의 변경 사항에 따라 릴리스 버전을 결정합니다.
* **Major 버전 상승 (Breaking Changes)**:
  - 카탈로그 코드 삭제 및 이름 변경
  - `params`의 필수 필드 추가 또는 타입 변경
* **Minor 버전 상승 (New Features)**:
  - 신규 카탈로그 코드 추가 (단, 클라이언트 Policy의 컴파일 exhaustiveness 검증 동반)
  - `params`의 optional 필드 추가
* **Patch 버전 상승 (Bug Fixes)**:
  - 내부 버그 수정 및 타입/스키마 비파괴적 개선
