const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/batch/page.tsx', 'utf8');
content = content.replace(/<table[\s\S]*?<\/table>/, `            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-container-highest text-on-surface-variant text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium">File Name</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Confidence</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id} className="border-b border-outline-variant/30 hover:bg-surface-container transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface max-w-[200px] truncate" title={item.name}>{item.name}</td>
                      <td className="px-6 py-4">
                        {item.verdict === 'PENDING' && <Chip label="Pending" />}
                        {item.verdict === 'PROCESSING' && <Chip label="Processing" variant="assist" className="animate-pulse" />}
                        {item.verdict === 'AUTHENTIC' && <Chip label="Authentic" variant="filter" className="!bg-emerald-500/20 !text-emerald-500" />}
                        {item.verdict === 'MANIPULATED' && <Chip label="Manipulated" variant="filter" className="!bg-error-container !text-on-error-container" />}
                        {item.verdict === 'ERROR' && <Chip label="Error" variant="filter" className="!bg-orange-500/20 !text-orange-500" />}
                      </td>
                      <td className="px-6 py-4 font-mono">{item.score ? (item.score * 100).toFixed(1) + '%' : '--'}</td>
                      <td className="px-6 py-4 text-on-surface-variant max-w-[300px] truncate" title={item.desc}>{item.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card List */}
            <div className="md:hidden flex flex-col divide-y divide-outline-variant/30">
              {queue.map((item) => (
                <div key={item.id} className="p-4 flex flex-col gap-3 hover:bg-surface-container transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-on-surface truncate pr-4" title={item.name}>{item.name}</span>
                    <span className="shrink-0">
                      {item.verdict === 'PENDING' && <Chip label="Pending" />}
                      {item.verdict === 'PROCESSING' && <Chip label="Processing" variant="assist" className="animate-pulse" />}
                      {item.verdict === 'AUTHENTIC' && <Chip label="Authentic" variant="filter" className="!bg-emerald-500/20 !text-emerald-500" />}
                      {item.verdict === 'MANIPULATED' && <Chip label="Manipulated" variant="filter" className="!bg-error-container !text-on-error-container" />}
                      {item.verdict === 'ERROR' && <Chip label="Error" variant="filter" className="!bg-orange-500/20 !text-orange-500" />}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span className="font-mono">{item.score ? 'Confidence: ' + (item.score * 100).toFixed(1) + '%' : 'Awaiting analysis'}</span>
                  </div>
                  {item.desc && (
                    <div className="text-sm text-on-surface-variant line-clamp-2">{item.desc}</div>
                  )}
                </div>
              ))}
            </div>`);
fs.writeFileSync('apps/web/src/app/batch/page.tsx', content);
