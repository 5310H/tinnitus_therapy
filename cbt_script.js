
>     <script>
          const questions = [
              "Because of your tinnitus, is it difficult for you to concentrate?",
              "Does the loudness of your tinnitus make it difficult for you to hear people?",
              "Does your tinnitus make you angry?",
              "Does your tinnitus make you confused?",
              "Because of your tinnitus, do you feel desperate?",
              "Do you complain a great deal about your tinnitus?",
              "Do you have trouble falling asleep at night because of your tinnitus?",
              "Do you feel as though you cannot escape your tinnitus?",
              "Does your tinnitus interfere with your ability to enjoy your social activities (e.g., going out to 
dinner, to the movies)?",
              "Because of your tinnitus, do you feel frustrated?",
              "Because of your tinnitus, do you feel that you have a terrible disease?",
              "Does your tinnitus make it difficult for you to enjoy life?",
              "Does your tinnitus interfere with your job or household responsibilities?",
              "Because of your tinnitus, do you find that you are often irritable?",
              "Because of your tinnitus, do you find it difficult to read?",
              "Does your tinnitus make you upset?",
              "Do you feel that your tinnitus has placed a stress on your relationships with members of your family 
and friends?",
              "Do you find it difficult to focus your attention away from your tinnitus and on to other things?",
              "Do you feel that you have no control over your tinnitus?",
              "Because of your tinnitus, do you often feel tired?",
              "Because of your tinnitus, do you feel depressed?",
              "Does your tinnitus make you feel anxious?",
              "Do you feel that you can no longer cope with your tinnitus?",
              "Does your tinnitus get worse when you are under stress?",
              "Does your tinnitus make you feel insecure?"
          ];
  
          const subscaleMap = [
              'F', 'F', 'E', 'F', 'C', 'E', 'F', 'C', 'F', 'E', // Q1-10
              'C', 'F', 'F', 'E', 'F', 'E', 'E', 'F', 'C', 'F', // Q11-20
              'E', 'E', 'C', 'F', 'E'                          // Q21-25
          ];
  
          let currentFormat = 'mc';
          let fastTapEnabled = false;
          let activeQuestionIdx = 0;
          const responses = new Array(25).fill(null);
  
          window.onload = () => {
              initNav(`
  
          <b>Habituation Assessment:</b> Take the <b>THI</b> once a month. Habituation is a slow process; monthly 
tracking provides a more accurate view of progress than daily check-ins.<br><br>
          
          <b>Sound Support:</b> Users often find it easier to complete cognitive exercises while playing low-level 
<b>Brown</b> or <b>Pink</b> noise to reduce the brain's immediate "threat" response.
      `);
  
              const lastAssessmentDate = getLastTHIAssessmentDate();
              if (lastAssessmentDate) {
                  document.getElementById('lastThiDate').textContent = `(Last taken: 
${lastAssessmentDate.toLocaleDateString()})`;
              }
  
              checkTHIReminderCBT();
              checkAIState();
  
              const sleepIssues = loadSetting('reports_sleep_issues', 'false') === 'true';
              document.getElementById('sleepIssuesToggle').checked = sleepIssues;
              document.getElementById('sleepIssuesToggle').onchange = (e) => {
                  saveSetting('reports_sleep_issues', e.target.checked);
              };
  
  
              // Restore questioning format preference
              currentFormat = loadSetting('thi_questioning_format', 'mc');
              document.getElementById('thiFormatSelect').value = currentFormat;
  
              // Restore Fast-Tap preference
              fastTapEnabled = loadSetting('thi_fast_tap_enabled', 'false') === 'true';
              document.getElementById('fastTapToggle').checked = fastTapEnabled;
  
              renderQuiz();
          };
  
          function renderQuiz() {
              const container = document.getElementById('quiz');
              container.innerHTML = '';
  
              questions.forEach((q, i) => {
                  const div = document.createElement('div');
                  div.className = 'question';
                  div.id = `q-block-${i}`;
                  div.style.display = (fastTapEnabled && i !== activeQuestionIdx) ? 'none' : 'block';
  
                  let badgeColor = 'var(--text-dim)';
                  let badgeText = '';
                  const sub = subscaleMap[i];
                  if (sub === 'F') { badgeColor = '#3498db'; badgeText = 'Functional'; }
                  else if (sub === 'E') { badgeColor = '#9c27b0'; badgeText = 'Emotional'; }
                  else if (sub === 'C') { badgeColor = '#e74c3c'; badgeText = 'Catastrophic'; }
  
                  const badgeHtml = `<span style="font-size: 0.65rem; background: ${badgeColor}20; color: 
${badgeColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 8px; text-transform: 
uppercase;">${badgeText}</span>`;
  
                  let optionsHtml = '';
                  if (currentFormat === 'mc') {
                      optionsHtml = `
                          <div class="options" data-idx="${i}">
                              <button class="opt-btn ${responses[i] === 4 ? 'active' : ''}" 
onclick="selectOption(this, 4)">Yes</button>
                              <button class="opt-btn ${responses[i] === 2 ? 'active' : ''}" 
onclick="selectOption(this, 2)">Sometimes</button>
                              <button class="opt-btn ${responses[i] === 0 ? 'active' : ''}" 
onclick="selectOption(this, 0)">No</button>
                          </div>
                      `;
                  } else if (currentFormat === 'tf') {
                      optionsHtml = `
                          <div class="options" data-idx="${i}">
                              <button class="opt-btn ${responses[i] === 4 ? 'active' : ''}" 
onclick="selectOption(this, 4)">True (Yes)</button>
                              <button class="opt-btn ${responses[i] === 0 ? 'active' : ''}" 
onclick="selectOption(this, 0)">False (No)</button>
                          </div>
                      `;
                  } else if (currentFormat === 'scale') {
                      optionsHtml = `<div class="scale-options" data-idx="${i}">`;
                      for (let r = 1; r <= 10; r++) {
                          const clinicalPoints = (r - 1) * (4 / 9);
                          const isActive = responses[i] !== null && Math.abs(responses[i] - clinicalPoints) < 0.01;
                          optionsHtml += `<button class="scale-btn ${isActive ? 'active' : ''}" 
onclick="selectOption(this, ${clinicalPoints})">${r}</button>`;
                      }
                      optionsHtml += `</div>`;
                  }
  
                  div.innerHTML = `
                      <p style="font-weight: 500; display: flex; align-items: center; justify-content: space-between;">
                          <span>${i + 1}. ${q}</span>
                          ${badgeHtml}
                      </p>
                      ${optionsHtml}
                  `;
                  container.appendChild(div);
              });
  
              updateWizardNav();
              updateProgressBar();
          }
  
          function changeFormat(val) {
              currentFormat = val;
              saveSetting('thi_questioning_format', val);
              renderQuiz();
          }
  
          function toggleFastTapMode(checked) {
              fastTapEnabled = checked;
              saveSetting('thi_fast_tap_enabled', checked ? 'true' : 'false');
              if (checked) {
                  const firstUnanswered = responses.findIndex(r => r === null);
                  activeQuestionIdx = firstUnanswered !== -1 ? firstUnanswered : 0;
              }
              renderQuiz();
          }
  
          function prevQuestion() {
              if (activeQuestionIdx > 0) {
                  activeQuestionIdx--;
                  renderQuiz();
              }
          }
  
          function nextQuestion() {
              if (activeQuestionIdx < 24) {
                  activeQuestionIdx++;
                  renderQuiz();
              }
          }
  
          function updateWizardNav() {
              const nav = document.getElementById('wizardNav');
              if (!nav) return;
              if (fastTapEnabled) {
                  nav.style.display = 'flex';
                  document.getElementById('wizardIndex').textContent = `${activeQuestionIdx + 1} / 25`;
              } else {
                  nav.style.display = 'none';
              }
          }
  
          function updateProgressBar() {
              const answeredCount = responses.filter(v => v !== null).length;
              const progress = (answeredCount / 25) * 100;
              document.getElementById('thiProgressBar').style.width = progress + '%';
          }
  
          function selectOption(btn, val) {
              const parent = btn.parentElement;
              parent.querySelectorAll('.opt-btn, .scale-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              
              const idx = parseInt(parent.dataset.idx);
              responses[idx] = val;
  
              updateProgressBar();
  
              if (fastTapEnabled) {
                  setTimeout(() => {
                      if (activeQuestionIdx < 24) {
                          nextQuestion();
                      } else {
                          document.getElementById('submitThi').scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                  }, 180);
              }
          }
  
          // Keyboard navigation for fast assessments
          document.addEventListener('keydown', (e) => {
              if (!fastTapEnabled) return;
              if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
  
              const key = e.key.toLowerCase();
              if (currentFormat === 'mc') {
                  if (key === 'y' || key === '1') selectByKey(4);
                  if (key === 's' || key === '2') selectByKey(2);
                  if (key === 'n' || key === '3') selectByKey(0);
              } else if (currentFormat === 'tf') {
                  if (key === 'y' || key === '1' || key === 't') selectByKey(4);
                  if (key === 'n' || key === '0' || key === 'f') selectByKey(0);
              } else if (currentFormat === 'scale') {
                  if (key >= '1' && key <= '9') {
                      const r = parseInt(key);
                      selectByKey((r - 1) * (4 / 9));
                  } else if (key === '0') {
                      selectByKey(4.0);
                  }
              }
  
              if (key === 'arrowleft') prevQuestion();
              if (key === 'arrowright') nextQuestion();
          });
  
          function selectByKey(val) {
              const currentBlock = document.getElementById(`q-block-${activeQuestionIdx}`);
              if (!currentBlock) return;
              const btn = Array.from(currentBlock.querySelectorAll('.opt-btn, .scale-btn')).find(b => {
                  if (currentFormat === 'scale') {
                      const rText = b.textContent.trim();
                      const expectedVal = (parseInt(rText) - 1) * (4 / 9);
                      return Math.abs(expectedVal - val) < 0.01;
                  } else {
                      const btnText = b.textContent.toLowerCase();
                      const bVal = btnText.includes('yes') || btnText.includes('true') ? 4 : 
(btnText.includes('sometimes') ? 2 : 0);
                      return bVal === val;
                  }
              });
              if (btn) btn.click();
          }
  
          /**
           * Checks if the AI key is available and provides UI feedback if it's locked or missing.
           */
          function checkAIState() {
              const responseBox = document.getElementById('aiHubResponse');
              if (!responseBox) return;
  
              const encryptedKeyExists = loadSetting('gemini_api_key_encrypted', null) !== null;
              const currentKey = activeSessionKey || loadSetting('gemini_api_key', '');
              const isConfigured = !!currentKey;
  
              if (encryptedKeyExists && !activeSessionKey) {
                  responseBox.style.display = 'flex';
                  responseBox.innerHTML = `<div class="chat-bubble ai-bubble" style="border-color: #ff9800;">???? 
<b>AI Features Locked.</b> Your API key is encrypted. Please return to the <a href="index.html" style="color: 
var(--accent); text-decoration: underline;">Dashboard</a> to enter your PIN and unlock AI assistance.</div>`;
              } else if (!isConfigured) {
                  responseBox.style.display = 'flex';
                  responseBox.innerHTML = `<div class="chat-bubble ai-bubble" style="border-color: #ef5350;">????? 
<b>AI Features Unconfigured.</b> This program does <u>not</u> provide an API key. Please return to the <a 
href="index.html" style="color: var(--accent); text-decoration: underline;">Dashboard</a> to add your own private key 
from Google AI Studio.</div>`;
              }
          }
  
          function calculateScore() {
              if (responses.includes(null)) {
                  const firstUnanswered = responses.findIndex(r => r === null);
                  if (firstUnanswered !== -1) {
                      if (fastTapEnabled) {
                          activeQuestionIdx = firstUnanswered;
                          renderQuiz();
                      } else {
                          document.getElementById(`q-block-${firstUnanswered}`).scrollIntoView({ behavior: 'smooth', 
block: 'center' });
                      }
                  }
                  return alert("Please answer all questions before calculating score.");
              }
              
              document.getElementById('thiStatus').textContent = ""; 
              
              let total = 0;
              let functional = 0;
              let emotional = 0;
              let catastrophic = 0;
  
              responses.forEach((val, idx) => {
                  const sub = subscaleMap[idx];
                  if (sub === 'F') functional += val;
                  if (sub === 'E') emotional += val;
                  if (sub === 'C') catastrophic += val;
                  total += val;
              });
  
              total = Math.round(total);
              functional = Math.round(functional);
              emotional = Math.round(emotional);
              catastrophic = Math.round(catastrophic);
  
              const formatName = currentFormat === 'mc' ? 'Multiple Choice' : currentFormat === 'tf' ? 'True/False' : 
'1-10 Scale';
              const logEntry = {
                  total: total,
                  functional: functional,
                  emotional: emotional,
                  catastrophic: catastrophic,
                  format: formatName
              };
  
              logDistressScore(logEntry);
  
              const grades = ["Slight", "Mild", "Moderate", "Severe", "Catastrophic"];
              const grade = total <= 16 ? grades[0] : total <= 36 ? grades[1] : total <= 56 ? grades[2] : total <= 76 
? grades[3] : grades[4];
  
              document.getElementById('thiStatus').textContent = "Score saved!";
              document.getElementById('thiStatus').style.color = "var(--accent)";
  
              document.getElementById('scoreValue').textContent = `Score: ${total}/100`;
              document.getElementById('scoreGrade').innerHTML = `
                  Severity: <b>${grade} Distress</b><br>
                  <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text); line-height: 1.5;">
                      Functional Impact: <b>${functional}/44</b><br>
                      Emotional Reaction: <b>${emotional}/36</b><br>
                      Catastrophic Reaction: <b>${catastrophic}/20</b>
                  </div>
              `;
              document.getElementById('scoreResult').style.display = 'block';
              document.getElementById('submitThi').textContent = "Score Saved";
  
              const newLastAssessmentDate = getLastTHIAssessmentDate();
              if (newLastAssessmentDate) {
                  document.getElementById('lastThiDate').textContent = `(Last taken: 
${newLastAssessmentDate.toLocaleDateString()})`;
              }
              document.getElementById('thiReminderCBT').style.display = 'none';
          }
  
          function checkTHIReminderCBT() {
              const lastAssessmentDate = getLastTHIAssessmentDate();
              const today = new Date();
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(today.getMonth() - 1);
              if (lastAssessmentDate && lastAssessmentDate < oneMonthAgo) {
                  document.getElementById('thiReminderCBT').style.display = 'block';
              }
          }
  
  
          function getReportData() {
              return { "Therapy Type": "Psychological Wellness (CBT)" };
          }
  
          function exportClinicalSettings() {
              const reportData = getClinicalReportData("CBT & Wellness", getReportData());
              const report = generateClinicalReportText(reportData);
              const blob = new Blob([report], { type: 'text/plain' });
              const report = generateClinicalReportText(reportData);
              const blob = new Blob([report], { type: 'text/plain' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `tinnitus_clinical_cbt.txt`;
              a.click();
          }
  
          async function generatePDFReport() {
              const reportData = getClinicalReportData("CBT & Wellness", getReportData());
              const htmlContent = generateClinicalReportHtml(reportData);
  
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = htmlContent;
              document.body.appendChild(tempDiv);
  
              const isDark = document.documentElement.classList.contains('light-mode');
              if (!isDark) document.documentElement.classList.add('light-mode');
  
              const opt = {
                  margin: [20, 15], filename: 'tinnitus_clinical_cbt.pdf', image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
              };
              await html2pdf().set(opt).from(tempDiv).save();
  
              if (!isDark) document.documentElement.classList.remove('light-mode');
              document.body.removeChild(tempDiv);
          }
  
  
  
          function emailToAudiologist() {
              const email = loadSetting('audiologist_email', '');
              if (!email) return alert("Please set your audiologist's email on the Home page.");
              const reportData = getClinicalReportData("CBT & Wellness", getReportData());
              const report = generateClinicalReportText(reportData);
              window.location.href = `mailto:${email}?subject=Tinnitus Clinical Report 
(CBT)&body=${encodeURIComponent(report)}`;
          }
  
          const pmrSteps = [
              { text: "Take 3 deep breaths. Focus on the air entering and leaving.", duration: 10000 },
              { text: "Tense your feet and toes tightly for 5 seconds... Now release completely.", duration: 10000 },
              { text: "Tense your calves and thighs... Hold... Now release and feel the heaviness.", duration: 10000 },
              { text: "Squeeze your glutes and pelvic muscles... Hold... Now release.", duration: 10000 },
              { text: "Tighten your stomach and chest... Hold... Now release.", duration: 10000 },
              { text: "Squeeze your hands into fists and tense your arms... Hold... Now release.", duration: 10000 },
              { text: "Shrug your shoulders up to your ears... Hold... Now release.", duration: 10000 },
              { text: "Clench your jaw and squint your eyes... Hold... Now release.", duration: 10000 },
              { text: "Tense your entire body at once... Hold... and let it all go.", duration: 10000 },
              { text: "Sit in the stillness for 60 seconds. Observe your tinnitus as just a neutral sound.", duration: 
60000 }
          ];
          let pmrActive = false, pmrIdx = 0, pmrTimer, pmrAudioCtx = null;
  
          function handlePMR() {
              if (pmrActive) startPMR();
              else if (pmrAudioCtx) startPMR();
              else showPreFlight(() => startPMR());
          }
  
          function playPmrCue(freq = 440) {
              if (!pmrAudioCtx) pmrAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
              if (pmrAudioCtx.state === 'suspended') pmrAudioCtx.resume();
              const osc = pmrAudioCtx.createOscillator();
              const g = pmrAudioCtx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, pmrAudioCtx.currentTime);
              g.gain.setValueAtTime(0, pmrAudioCtx.currentTime);
              g.gain.linearRampToValueAtTime(0.1, pmrAudioCtx.currentTime + 0.1);
              g.gain.exponentialRampToValueAtTime(0.001, pmrAudioCtx.currentTime + 1.5);
              osc.connect(g).connect(pmrAudioCtx.destination);
              osc.start();
              osc.stop(pmrAudioCtx.currentTime + 1.5);
          }
  
          function startPMR() {
              if (pmrActive) {
                  clearTimeout(pmrTimer);
                  pmrActive = false;
                  const btn = document.getElementById('pmrBtn');
                  btn.textContent = "Start PMR Sequence"; btn.classList.replace('stop-btn', 'play-btn');
                  document.getElementById('pmrStepText').textContent = "Ready to begin?";
                  document.getElementById('pmrProgressBar').style.width = "0%";
                  return;
              }
              pmrActive = true; pmrIdx = 0;
              const btn = document.getElementById('pmrBtn');
              btn.textContent = "Stop Sequence"; btn.classList.replace('play-btn', 'stop-btn');
              runPmrStep();
          }
  
          function runPmrStep() {
              if (!pmrActive) return;
              if (pmrIdx >= pmrSteps.length) {
                  document.getElementById('pmrStepText').textContent = "Sequence complete. You are relaxed and safe.";
                  document.getElementById('pmrBtn').textContent = "Restart PMR Sequence";
                  document.getElementById('pmrProgressBar').style.width = "100%";
                  playPmrCue(523.25); // Completion chime
                  pmrActive = false;
                  return;
              }
              const step = pmrSteps[pmrIdx];
              document.getElementById('pmrStepText').textContent = step.text;
              const progress = (pmrIdx / pmrSteps.length) * 100;
              document.getElementById('pmrProgressBar').style.width = progress + "%";
              playPmrCue(pmrIdx === pmrSteps.length - 1 ? 329.63 : 440);
              pmrIdx++;
              pmrTimer = setTimeout(runPmrStep, step.duration);
          }
  
          function showAILoading() {
              const box = document.getElementById('aiHubResponse');
              box.style.display = 'flex';
              box.innerHTML = `<div class="chat-bubble ai-bubble"><div class="typing"><div class="dot"></div><div 
class="dot"></div><div class="dot"></div></div></div>`;
          }
  
          function setAIResponse(html) {
              const box = document.getElementById('aiHubResponse');
              box.style.display = 'flex';
              box.innerHTML = `<div class="chat-bubble ai-bubble">${html.replace(/\n/g, '<br>')}</div>`;
          }
  
          async function triggerSOS() {
              showAILoading();
              const response = await getSOSSupport();
              setAIResponse(response);
          }
  
          async function askTRT() {
              // Disabled as text input has been removed
              return;
          }
  
          async function triggerPatternAnalysis() {
              showAILoading();
              const response = await getPatternAnalysis("Please analyze my recent trends.");
              setAIResponse(response);
          }
  
  
          /**
           * Clears the AI chat interface.
           */
          function clearAIChat() {
              const box = document.getElementById('aiHubResponse');
              box.innerHTML = '';
              box.style.display = 'none';
          }
  
          async function generateAISummaryForReport() {
              // This function is not directly used for PDF/TXT reports, but for a potential UI element.
              // If you add a button to generate and display the summary in the UI, this function would be used.
              // For PDF/TXT reports, the summary is generated within the export functions.
          }
      </script>
  </body>
  
  </html>


