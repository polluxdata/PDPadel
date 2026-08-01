import GroupClient from './GroupClient';

export default function GroupPage({ params }: { params: { id: string } }) {
  return <GroupClient groupId={params.id} />;
}
