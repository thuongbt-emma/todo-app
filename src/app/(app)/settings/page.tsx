import { BulkImport } from '@/components/BulkImport';
import { SettingsForm } from '@/components/SettingsForm';
import { TaxonomyEditor } from '@/components/TaxonomyEditor';
import { TrashList } from '@/components/TrashList';
import { getTaxonomy, getTrash, getUsage } from '@/lib/todo/queries';
import { getSettings } from '@/lib/todo/taxonomy';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const [settings, { groups, tags, people }, trash, usage] = await Promise.all([getSettings(), getTaxonomy(), getTrash(), getUsage()]);
  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
      <Section title="Giao diện"><SettingsForm settings={settings} /></Section>
      <Section title="Nhóm"><TaxonomyEditor kind="group" items={groups} usage={usage.groups} /></Section>
      <Section title="Tag"><TaxonomyEditor kind="tag" items={tags} usage={usage.tags} /></Section>
      <Section title="Người"><TaxonomyEditor kind="person" items={people} usage={usage.people} /></Section>
      <div className="md:col-span-2"><Section title="Nhập nhiều dòng"><BulkImport /></Section></div>
      <div className="md:col-span-2"><Section title="Thùng rác"><TrashList cards={trash.cards} steps={trash.steps} notes={trash.notes} /></Section></div>
    </div>
  );
}
