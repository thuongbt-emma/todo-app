import { getCard, getTaxonomy } from '@/lib/todo/queries';
import { CardDrawer } from './CardDrawer';

export async function DrawerSlot({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const id = typeof searchParams.card === 'string' ? searchParams.card : null;
  if (!id) return null;
  const [card, { groups, tags, people }] = await Promise.all([getCard(id), getTaxonomy()]);
  if (!card) return null;
  const pick = (x: { id: string; name: string; color: string }) => ({ id: x.id, name: x.name, color: x.color });
  return <CardDrawer key={card.id} card={card} groups={groups.map(pick)} tags={tags.map(pick)} people={people.map(pick)} />;
}
