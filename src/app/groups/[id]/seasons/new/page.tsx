import NewSeasonClient from './NewSeasonClient';

export default function NewSeasonPage({ params }: { params: { id: string } }) {
  return <NewSeasonClient groupId={params.id} />;
}
