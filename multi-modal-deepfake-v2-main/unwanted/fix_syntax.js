const fs = require('fs');
 // Not available? I'll use standard fs methods
const path = require('path');

const dir = 'apps/web/src/app';

function fixFile(filePath) {
    if (!filePath.endsWith('.tsx')) return;
    let code = fs.readFileSync(filePath, 'utf-8');
    
    // Fix syntax issues
    code = code.replace(/<\/(path|circle|input|img|hr|br)>/gi, '');
    code = code.replace(/viewbox=/gi, 'viewBox=');
    code = code.replace(/fill-opacity=/gi, 'fillOpacity=');
    code = code.replace(/stroke-dasharray=/gi, 'strokeDasharray=');
    code = code.replace(/stroke-opacity=/gi, 'strokeOpacity=');
    
    // Fix { inside code blocks in api-hub
    code = code.replace(/\{report\.confidence_score \* 100:\.2f\}%/g, '{"{"}report.confidence_score * 100:.2f{"}"}%');
    code = code.replace(/\{report\.forensic_biomarkers\.primary_anomaly\}/g, '{"{"}report.forensic_biomarkers.primary_anomaly{"}"}');
    
    fs.writeFileSync(filePath, code, 'utf-8');
}

function traverse(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
        const fullPath = path.join(currentDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else {
            fixFile(fullPath);
        }
    }
}

traverse(dir);
console.log('Fixed React syntax errors!');
