import { redirect } from 'next/navigation';

export default function RedirectPage(): never {
  redirect('/');
}
