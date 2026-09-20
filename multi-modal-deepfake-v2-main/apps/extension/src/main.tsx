import React from 'react';
import ReactDOM from 'react-dom/client';
import { Card, Button } from '@repo/ui';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div className="p-4 w-64">
      <Card>
        <h2 className="text-lg font-bold">Popup UI</h2>
        <Button>Analyze Current Page</Button>
      </Card>
    </div>
  </React.StrictMode>
);
