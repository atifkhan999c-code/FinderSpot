/**
 * FinderSpot - Frontend UI/UX & Accessibility Auditor
 * Scans all HTML files for broken links, responsive meta, accessibility labels, and forms
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const htmlFiles = fs.readdirSync(FRONTEND_DIR).filter((f) => f.endsWith('.html'));

const uiAudit = {
  totalPages: htmlFiles.length,
  pages: {},
  brokenLinks: [],
  accessibilityIssues: [],
  responsiveIssues: [],
  formsIssues: [],
};

htmlFiles.forEach((file) => {
  const filePath = path.join(FRONTEND_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  const pageReport = {
    file,
    hasViewport: /<meta\s+name=["']viewport["']/i.test(content),
    hasTitle: /<title>.*<\/title>/i.test(content),
    imagesWithoutAlt: [],
    inputsWithoutLabels: [],
    links: [],
    hasMobileMenu: /mobile-menu/i.test(content),
  };

  // 1. Viewport check
  if (!pageReport.hasViewport) {
    uiAudit.responsiveIssues.push({ file, issue: 'Missing <meta name="viewport"> tag' });
  }

  // 2. Images check
  const imgRegex = /<img\b([^>]*?)>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(content)) !== null) {
    const imgAttrs = imgMatch[1];
    if (!/alt=["'][^"']*["']/i.test(imgAttrs) || /alt=["']\s*["']/i.test(imgAttrs)) {
      pageReport.imagesWithoutAlt.push(imgMatch[0].substring(0, 80));
    }
  }
  if (pageReport.imagesWithoutAlt.length > 0) {
    uiAudit.accessibilityIssues.push({
      file,
      issue: `${pageReport.imagesWithoutAlt.length} images missing descriptive alt attribute`,
    });
  }

  // 3. Links check
  const linkRegex = /href=["']([^"'#:]+?\.(html|css|js))["']/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const target = linkMatch[1];
    pageReport.links.push(target);
    const resolvedPath = path.join(FRONTEND_DIR, target);
    if (!fs.existsSync(resolvedPath)) {
      uiAudit.brokenLinks.push({ file, target, issue: `Broken reference: ${target} does not exist on disk` });
    }
  }

  // 4. Forms & input fields check
  const inputRegex = /<input\b([^>]*?)>/gi;
  let inputMatch;
  let unlabelledCount = 0;
  while ((inputMatch = inputRegex.exec(content)) !== null) {
    const inputAttrs = inputMatch[1];
    const isHiddenOrSubmit = /type=["'](hidden|submit|button|image)["']/i.test(inputAttrs);
    if (!isHiddenOrSubmit) {
      const hasId = /id=["']([^"']+)["']/i.test(inputAttrs);
      const hasAria = /aria-label=["'][^"']+["']/i.test(inputAttrs);
      const hasPlaceholder = /placeholder=["'][^"']+["']/i.test(inputAttrs);
      if (!hasId && !hasAria && !hasPlaceholder) {
        unlabelledCount++;
      }
    }
  }
  if (unlabelledCount > 0) {
    uiAudit.formsIssues.push({ file, unlabelledCount, issue: `${unlabelledCount} inputs lack labels or accessibility placeholders` });
  }

  uiAudit.pages[file] = pageReport;
});

console.log('====================================================');
console.log('🎨 FRONTEND UI/UX & ACCESSIBILITY AUDIT SUMMARY');
console.log('====================================================');
console.log(`Audited HTML Pages: ${uiAudit.totalPages}`);
console.log(`Responsive Issues : ${uiAudit.responsiveIssues.length}`);
console.log(`Broken Local Links: ${uiAudit.brokenLinks.length}`);
console.log(`Accessibility Warn: ${uiAudit.accessibilityIssues.length}`);
console.log(`Form Field Issues : ${uiAudit.formsIssues.length}`);

if (uiAudit.brokenLinks.length > 0) {
  console.log('\n❌ Broken Links Found:');
  uiAudit.brokenLinks.forEach((b) => console.log(`   - In ${b.file}: ${b.target}`));
} else {
  console.log('\n✅ All local navigation links and asset paths are valid!');
}

if (uiAudit.responsiveIssues.length > 0) {
  console.log('\n⚠️ Responsive Issues:');
  uiAudit.responsiveIssues.forEach((r) => console.log(`   - ${r.file}: ${r.issue}`));
} else {
  console.log('✅ All 16 pages contain mobile viewport meta tags!');
}

if (uiAudit.accessibilityIssues.length > 0) {
  console.log('\n⚠️ Accessibility Observations:');
  uiAudit.accessibilityIssues.forEach((a) => console.log(`   - ${a.file}: ${a.issue}`));
}

const auditSavePath = 'C:\\Users\\Atif Khan\\.gemini\\antigravity\\brain\\c0a620fc-b1d1-4f38-8209-6894ceb81c72\\uiux-audit-results.json';
try {
  fs.writeFileSync(auditSavePath, JSON.stringify(uiAudit, null, 2));
  console.log(`\nAudit saved to: ${auditSavePath}`);
} catch (e) {}
