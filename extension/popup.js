document.getElementById('extractBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('extractBtn');
  
  btn.disabled = true;
  statusDiv.textContent = 'Procesando...';
  statusDiv.className = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('tec-appsext.itcr.ac.cr') && !tab.url.includes('frmMatricula.aspx')) {
      throw new Error('Debes estar en la página de matrícula del TEC');
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getPageHTML,
    });

    const html = result[0].result;
    
    // Copy to clipboard
    await navigator.clipboard.writeText(html);
    
    statusDiv.textContent = '¡Copiado! Pégalo en el Creador de Horarios';
    statusDiv.className = 'success';
    btn.textContent = '¡Listo!';
    
    setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Copiar Datos al Portapapeles';
    }, 3000);

  } catch (err) {
    statusDiv.textContent = err.message || 'Error al extraer datos';
    statusDiv.className = 'error';
    btn.disabled = false;
  }
});

function getPageHTML() {
  return document.documentElement.outerHTML;
}
