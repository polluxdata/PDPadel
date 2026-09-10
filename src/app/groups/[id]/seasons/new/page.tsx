import NewSeasonClient from './NewSeasonClient';

export default async function NewSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  return <NewSeasonClient groupId={(await params).id} />;
}
