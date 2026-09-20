import { Card, Button, CircularProgress } from '@repo/ui';

export function BatchUploader() {
  return (
    <Card className="mt-8">
      <h3 className="text-xl font-bold mb-4">Batch Processing</h3>
      <div className="flex items-center gap-4 border-2 border-dashed border-white/20 p-8 rounded-xl justify-center text-gray-400">
        <p>Drag and drop multiple files here</p>
        <Button>Select Files</Button>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center bg-white/5 p-2 rounded">
          <span className="truncate max-w-xs">video1.mp4</span>
          <CircularProgress />
        </div>
        <div className="flex justify-between items-center bg-white/5 p-2 rounded">
          <span className="truncate max-w-xs">audio2.mp3</span>
          <span className="text-green-400">Real (98%)</span>
        </div>
      </div>
    </Card>
  );
}
