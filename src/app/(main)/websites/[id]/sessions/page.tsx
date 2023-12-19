import Sessions from './Sessions';

export default function WebsiteSessionsPage({ params: { id } }) {
  if (!id) {
    return null;
  }

  return <Sessions websiteId={id} />;
}
