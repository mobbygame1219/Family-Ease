export default function FridgePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
            🧊
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Family Fridge</h1>
        </div>
        <p className="text-gray-500 text-sm">管理冰箱食材、掃描收據、設計菜單</p>
      </div>

      <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-16 text-center">
        <div className="text-4xl mb-4">🧊</div>
        <p className="text-blue-700 font-medium mb-2">即將推出！</p>
        <p className="text-blue-500 text-sm">Family Fridge 功能正在開發中，敬請期待！</p>
      </div>
    </div>
  );
}