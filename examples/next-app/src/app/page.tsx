import Link from 'next/link';
import { ProfileForm } from './profile-form';

export default function HomePage() {
  return (
    <main>
      <h1>Resilio Next.js integration example</h1>
      <ProfileForm />
      <Link href="/missing">Open not-found example</Link>
      <Link href="/redirect-test">Open redirect example</Link>
      <Link href="/unexpected">Open unexpected error example</Link>
    </main>
  );
}
