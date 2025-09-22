import UserProfileClient from './UserProfileClient';

// Generate static params for dynamic routes
export async function generateStaticParams() {
  return [];
}

export default function UserProfilePage() {
  return <UserProfileClient />;
}