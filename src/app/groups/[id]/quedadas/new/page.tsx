import NewQuedadaClient from './NewQuedadaClient';

export default function NewQuedadaPage({ params }: { params: { id: string } }) {
  return <NewQuedadaClient groupId={params.id} />;
}
