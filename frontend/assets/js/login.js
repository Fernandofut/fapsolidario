// login.js – handles login form submission asynchronously
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault(); // stop default page reload

  const msgErro = document.getElementById('msg-erro');
  msgErro.style.display = 'none';

  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  console.log('Submitting login for', email);

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // send session cookie
      body: JSON.stringify({ email, senha })
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('Login failed:', data);
      alert(data.mensagem || 'Falha no login');
      msgErro.textContent = data.mensagem || 'Erro desconhecido';
      msgErro.style.display = 'block';
      return;
    }
    console.log('Login successful:', data);
    // Redirect according to server-provided path or default dashboard
    window.location.href = data.redirecionar || '/pages/opcoes.html';
  } catch (err) {
    console.error('Network error during login:', err);
    alert('Erro de rede ao tentar fazer login');
    msgErro.textContent = err.message;
    msgErro.style.display = 'block';
  }
});
