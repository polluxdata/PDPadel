import MembersClient from './MembersClient';

export default async function GroupMembersPage({ params }: { params: Promise<{ id: string }> }) {
  return <MembersClient groupId={(await params).id} />;
}
