import Timer from '@/app/components/Timer';

export default function Page() {
  const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
  const endedAt = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // 3 minutes ago

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <Timer startedAt={startedAt} endedAt={endedAt} />
    </div>
  );
}
