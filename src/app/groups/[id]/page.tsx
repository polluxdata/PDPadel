import GroupClient from './GroupClient';

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  return <GroupClient groupId={(await params).id} />;
}
