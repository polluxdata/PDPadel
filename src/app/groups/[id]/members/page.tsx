import MembersClient from './MembersClient';

export default function GroupMembersPage({ params }: { params: { id: string } }) {
  return <MembersClient groupId={params.id} />;
}
