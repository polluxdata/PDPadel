import NewQuedadaClient from './NewQuedadaClient';

export default async function NewQuedadaPage({ params }: { params: Promise<{ id: string }> }) {
  return <NewQuedadaClient groupId={(await params).id} />;
}
