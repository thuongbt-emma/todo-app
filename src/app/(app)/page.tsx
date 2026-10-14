import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/todo/taxonomy';

export default async function Home() {
  redirect(`/${(await getSettings()).defaultView}`);
}
