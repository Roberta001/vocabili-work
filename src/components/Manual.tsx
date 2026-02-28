export default function Manual({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start max-w-[600px] p-4">
      <h2 className="text-2xl font-bold mt-4 mb-2 ml-2">操作说明</h2>
      <ol className="list-decimal ml-6 space-y-1">{children}</ol>
    </div>
  );
}
