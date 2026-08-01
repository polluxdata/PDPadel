import SeasonClient from './SeasonClient';

export default function SeasonPage({
  params,
}: {
  params: { id: string; seasonId: string };
}) {
  return <SeasonClient groupId={params.id} seasonId={params.seasonId} />;
}
