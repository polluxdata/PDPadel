import SeasonClient from './SeasonClient';

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>;
}) {
  const { id, seasonId } = await params;
  return <SeasonClient groupId={id} seasonId={seasonId} />;
}
