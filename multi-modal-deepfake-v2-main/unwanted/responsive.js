const fs = require('fs');
let css = fs.readFileSync('apps/web/src/app/globals.css', 'utf-8');

const responsiveOverrides = `
@media (max-width: 768px) {
  :root {
    --spacing-margin-desktop: 16px !important;
    --spacing-gutter: 16px !important;
    --spacing-lg: 24px !important;
    --spacing-xl: 32px !important;
  }
  .grid {
    grid-template-columns: 1fr !important;
  }
  .max-w-\\[1520px\\], .max-w-\\[1760px\\] {
    max-width: 100% !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
}
`;

fs.writeFileSync('apps/web/src/app/globals.css', css + '\n\n' + responsiveOverrides, 'utf-8');
console.log('Added responsive overrides!');
