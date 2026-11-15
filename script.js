const sampleModules=[
 ['Foundations','Understand the essential building blocks'],
 ['Core concepts','Learn the most important ideas and vocabulary'],
 ['Guided practice','Apply what you have learned with examples'],
 ['Build and apply','Use your knowledge in a small project']
];
function generateRoadmap(){
 const goal=document.getElementById('goal').value.trim();
 if(!goal){toast('Enter something you want to learn first.');document.getElementById('goal').focus();return}
 const level=document.getElementById('level').value, time=document.getElementById('time').value;
 document.getElementById('roadmapTitle').textContent=goal;
 document.getElementById('roadmapDesc').textContent=\`Suggested starting path · \${level} · \${time} per day. This is sample demo logic, not a live AI-generated course.\`;
 document.getElementById('moduleList').innerHTML=sampleModules.map((m,i)=>\`<div class="module"><div class="num">\${String(i+1).padStart(2,'0')}</div><div><strong>\${m[0]}</strong><small>\${m[1]}</small></div><button onclick="editModule(this)">Edit</button></div>\`).join('');
 document.getElementById('roadmapModal').classList.add('show');
}
function editModule(btn){const title=btn.parentElement.querySelector('strong');const next=prompt('Rename this module:',title.textContent);if(next&&next.trim())title.textContent=next.trim()}
function openLesson(course,topic){document.getElementById('lessonTitle').textContent=topic;document.getElementById('lessonSubtitle').textContent=course+' · Continue learning at your own pace.';document.getElementById('lessonModal').classList.add('show');setTab(document.querySelector('.lesson-tabs button'),'read')}
function setTab(btn,tab){document.querySelectorAll('.lesson-tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const box=document.getElementById('lessonContent');
 if(tab==='read')box.innerHTML='<b>Start with the big idea</b><p>Every topic becomes easier when you understand its core idea first. This lesson would introduce the concept, explain why it matters, and build up with clear examples.</p><p><b>Example</b><br>Imagine learning a new skill one small step at a time. Each step gives you the foundation for the next.</p>';
 if(tab==='practice')box.innerHTML='<b>Quick knowledge check</b><p>What is the best way to check whether you understand a new concept?</p><button class="tiny-btn" onclick="toast(\\'Good try — explain the idea in your own words to check understanding.\\')">A. Re-read the same paragraph</button> <button class="tiny-btn" onclick="toast(\\'Exactly! Retrieval practice helps test what you can recall.\\')">B. Try explaining it from memory</button>';
 if(tab==='ask')box.innerHTML='<b>Ask your AI tutor</b><p>What would you like explained differently?</p><input id="tutorQuestion" placeholder="Ask a question..." style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px"><button class="full" style="margin-top:10px" onclick="toast(\\'AI tutor connection will be added in the next build phase.\\')">Ask tutor</button><p class="muted">Tutor responses in this demo are not connected to an AI model yet.</p>';
}
function closeModal(id){document.getElementById(id).classList.remove('show')}
function backdropClose(e,id){if(e.target.id===id)closeModal(id)}
let toastTimer;function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(b.dataset.page!=='overview')toast(b.querySelector('.navtext').textContent+' is a preview section for a later version.')}))