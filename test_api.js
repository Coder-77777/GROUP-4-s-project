(async () => {
  try {
    const base = 'http://localhost:3000';

    const rawH = await (await fetch(base + '/')).text();
    console.log('GET / -> RAW:', rawH);

    const registerResp = await fetch(base + '/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Tester', email: 'tester@example.com', password: 'Password123' })
    });
    const regText = await registerResp.text();
    console.log('/register RAW ->', regText);

    const loginResp = await fetch(base + '/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'tester@example.com', password: 'Password123' })
    });
    const loginText = await loginResp.text();
    console.log('/login RAW ->', loginText);

    const loginData = JSON.parse(loginText);
    const token = loginData.token;
    console.log('token ->', token);

    const genResp = await fetch(base + '/generate-quiz', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ syllabusText: 'Basics of AI', difficulty: 'Medium', questionCount: 3, topic: 'AI' })
    });
    const genText = await genResp.text();
    console.log('/generate-quiz RAW ->', genText);
    const genJson = JSON.parse(genText);
    console.log('/generate-quiz JSON ->', genJson);

    const saveResp = await fetch(base + '/save-result', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score: 2, total: 3, percentage: 67, difficulty: 'Medium', topic: 'AI', duration: 120 })
    });
    const saveText = await saveResp.text();
    console.log('/save-result RAW ->', saveText);
    console.log('/save-result JSON ->', JSON.parse(saveText));

  } catch (err) {
    console.error('API test error', err);
    process.exitCode = 1;
  }
})();
