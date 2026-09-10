import QuedadaClient from './QuedadaClient';

export default async function QuedadaPage({
  params,
}: {
  params: Promise<{ id: string; qid: string }>;
}) {
  const { id, qid } = await params;
  return <QuedadaClient groupId={id} quedadaId={qid} />;
}
