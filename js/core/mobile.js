// Accessible mobile table layout. Keep original rows/buttons (no clones), so all feature event handlers still work.
// Dynamic search/filter results insert new tables; a single observer enhances them when they appear.
export function installMobileTables(view) {
  const enhance = () => {
    view.querySelectorAll('.table-wrap').forEach(wrap => {
      if (wrap.closest('.semester-course-table')) return;
      const table = wrap.querySelector(':scope > table');
      if (!table || !table.tHead || !table.tBodies.length) return;
      const labels = Array.from(table.tHead.rows[0]?.cells || []).map(cell => cell.textContent.trim());
      if (!labels.length) return;
      // Only adapt complete data tables; the semester comparison grid deliberately stays scrollable.
      wrap.classList.add('mobile-stack-table');
      wrap.setAttribute('role','region');
      wrap.setAttribute('aria-label', labels.includes('Actions') ? 'Records with actions' : 'Records');
      wrap.tabIndex = 0;
      table.querySelectorAll('tbody tr').forEach(row => {
        Array.from(row.cells).forEach((cell,i) => {
          if (labels[i]) cell.dataset.label = labels[i];
        });
      });
    });
  };
  const observer = new MutationObserver(enhance);
  observer.observe(view, {childList:true,subtree:true});
  enhance();
  return () => observer.disconnect();
}
