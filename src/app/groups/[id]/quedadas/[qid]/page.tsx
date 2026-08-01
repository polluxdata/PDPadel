import QuedadaClient from './QuedadaClient';

export default function QuedadaPage({
  params,
}: {
  params: { id: string; qid: string };
}) {
  return <QuedadaClient groupId={params.id} quedadaId={params.qid} />;
}
