document.addEventListener('DOMContentLoaded', () => {
    
    const LS_KEY = 'super_todo_dashboard';
    const taskListEl = document.getElementById('taskList');
    const addForm = document.getElementById('addForm');
    const taskText = document.getElementById('taskText');
    const prioritySel = document.getElementById('priority');
    const dueDateInput = document.getElementById('dueDate');
    const categoryInput = document.getElementById('categoryInput');
    const filters = document.querySelectorAll('.filters button');
    const searchInput = document.getElementById('search');
    const themeToggle = document.getElementById('themeToggle');
    const stats = {
        total: document.getElementById('statTotal'),
        active: document.getElementById('statActive'),
        done: document.getElementById('statDone'),
        today: document.getElementById('statToday')
    };
    const calendarDate = document.getElementById('calendarDate');
    const calendarList = document.getElementById('calendarList');
    const toast = document.getElementById('toast');
    const importFile = document.getElementById('importFile');
    const exportBtn = document.getElementById('exportBtn');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const categoryChartEl = document.getElementById('categoryChart');

    let tasks = [], filterMode = 'all', themeDark = false, categoryChart = null;


    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
    function save(){ localStorage.setItem(LS_KEY, JSON.stringify({tasks, themeDark})); }
    function load(){ 
        try{
            const raw = localStorage.getItem(LS_KEY);
            if(raw){ 
                const data = JSON.parse(raw);
                tasks = data.tasks || [];
                themeDark = !!data.themeDark;
                if(themeDark) document.body.classList.add('dark');
            }
        } catch(e){ tasks=[]; }
    }
    function toastShow(msg,time=2500){ toast.textContent=msg; toast.style.display='block'; setTimeout(()=>toast.style.display='none',time);}
    function formatDate(iso){ const d=new Date(iso); if(isNaN(d)) return ''; return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
    function notify(msg){ if(Notification.permission==='granted'){ new Notification(msg); }}

    
    function addTaskObj(obj){ 
        tasks.unshift(obj); save(); render(); toastShow('Görev eklendi'); 
        if(obj.due) setTimeout(()=>notify(`Görev zamanı: ${obj.text}`), new Date(obj.due)-new Date()); 
    }

    addForm.addEventListener('submit', e=>{
        e.preventDefault();
        const text = taskText.value.trim();
        if(!text) return;
        addTaskObj({
            id: uid(),
            text,
            done: false,
            priority: prioritySel.value,
            category: categoryInput.value.trim() || 'Genel',
            due: dueDateInput.value || null,
            subtasks: [],
            order: Date.now(),
            recurring: null,
            chain: 0
        });
        taskText.value=''; dueDateInput.value=''; categoryInput.value='';
    });

    function deleteTask(id){ tasks = tasks.filter(t=>t.id!==id); save(); render(); toastShow('Görev silindi'); }
    function toggleDone(id){ const t = tasks.find(x=>x.id===id); if(!t) return; t.done = !t.done; t.chain = t.done ? t.chain+1 : t.chain; save(); render(); }
    function addSubtask(taskId, subText){ const t = tasks.find(x=>x.id===taskId); if(!t) return; t.subtasks.push({id:uid(), text:subText, done:false}); save(); render(); }
    function toggleSubtask(taskId, subId){ const t = tasks.find(x=>x.id===taskId); if(!t) return; const s = t.subtasks.find(y=>y.id===subId); if(!s) return; s.done = !s.done; save(); render(); }
    function calcProgress(task){ if(!task.subtasks.length) return task.done?100:0; const doneCount = task.subtasks.filter(s=>s.done).length; return Math.round((doneCount/task.subtasks.length)*100); }
    function clearCompleted(){ tasks = tasks.filter(t=>!t.done); save(); render(); toastShow('Tamamlananlar temizlendi'); }

    
    function render(){
        taskListEl.innerHTML='';
        const q = searchInput.value.trim().toLowerCase();
        const now = new Date();
        tasks.sort((a,b)=>(b.order||0)-(a.order||0));
        tasks.forEach(task=>{
            if(filterMode==='active' && task.done) return;
            if(filterMode==='completed' && !task.done) return;
            if(filterMode==='today'){ if(!task.due) return; const d=new Date(task.due); if(d.toDateString()!==now.toDateString()) return; }
            if(q && !task.text.toLowerCase().includes(q) && !(task.category||'').toLowerCase().includes(q)) return;

            const li = document.createElement('li'); li.className='task'; if(task.done) li.classList.add('completed');
            const left = document.createElement('div'); left.className='left';
            const cb = document.createElement('div'); cb.className='checkbox'+(task.done?' checked':''); cb.onclick=()=>toggleDone(task.id);
            const meta = document.createElement('div'); meta.className='meta';
            const title = document.createElement('div'); title.className='title'; title.textContent=task.text; title.contentEditable=true;
            title.addEventListener('blur',()=>{ const v=title.innerText.trim(); if(v){task.text=v; save();} else{title.innerText=task.text;}});
            meta.appendChild(title); left.appendChild(cb); left.appendChild(meta);

            if(task.subtasks.length){
                const subDiv = document.createElement('div'); subDiv.className='subtasks';
                task.subtasks.forEach(sub=>{
                    const sDiv = document.createElement('div'); sDiv.className='subtask';
                    const sCb = document.createElement('div'); sCb.className='checkbox'+(sub.done?' checked':''); sCb.onclick=()=>toggleSubtask(task.id,sub.id);
                    const sTitle = document.createElement('div'); sTitle.textContent=sub.text; sTitle.contentEditable=true;
                    sTitle.addEventListener('blur',()=>{ const v=sTitle.innerText.trim(); if(v){sub.text=v; save();}else{sTitle.innerText=sub.text;}});
                    sDiv.appendChild(sCb); sDiv.appendChild(sTitle); subDiv.appendChild(sDiv);
                });
                left.appendChild(subDiv);
                const progress = document.createElement('div'); progress.className='progressBar';
                const fill = document.createElement('div'); fill.className='progressFill'; fill.style.width = calcProgress(task)+'%';
                progress.appendChild(fill); left.appendChild(progress);
            }

            const actions = document.createElement('div'); actions.className='actions';
            const editBtn = document.createElement('button'); editBtn.className='iconBtn'; editBtn.textContent='✏️'; editBtn.onclick=()=>{ const t=prompt('Görevi düzenle', task.text); if(t){task.text=t; save(); render();}};
            const delBtn = document.createElement('button'); delBtn.className='iconBtn'; delBtn.textContent='🗑️'; delBtn.onclick=()=>{ if(confirm('Silinsin mi?')) deleteTask(task.id);};
            const doneBtn = document.createElement('button'); doneBtn.className='iconBtn'; doneBtn.textContent='✔️'; doneBtn.onclick=()=>toggleDone(task.id);
            const addSubBtn = document.createElement('button'); addSubBtn.className='iconBtn'; addSubBtn.textContent='➕'; addSubBtn.onclick=()=>{ const t=prompt('Alt görev girin'); if(t) addSubtask(task.id,t);};

            actions.appendChild(editBtn); actions.appendChild(delBtn); actions.appendChild(doneBtn); actions.appendChild(addSubBtn);
            li.appendChild(left); li.appendChild(actions); taskListEl.appendChild(li);
        });

        updateStats();
        renderCalendar();
        renderCategoryChart();
        save();
    }

    function updateStats(){
        stats.total.textContent = tasks.length;
        stats.done.textContent = tasks.filter(t=>t.done).length;
        stats.active.textContent = tasks.filter(t=>!t.done).length;
        stats.today.textContent = tasks.filter(t=>t.due && new Date(t.due).toDateString()===new Date().toDateString()).length;
    }

    function renderCalendar(){
        calendarList.innerHTML='';
        const sel = calendarDate.value?new Date(calendarDate.value):null;
        tasks.filter(t=>t.due).sort((a,b)=>new Date(a.due)-new Date(b.due)).forEach(t=>{
            const d = new Date(t.due);
            if(sel && d.toDateString()!==sel.toDateString()) return;
            const el = document.createElement('div'); el.className='calendarItem'; el.textContent=`${formatDate(t.due)} - ${t.text} [${t.category||'Genel'}]`; calendarList.appendChild(el);
        });
    }

    function renderCategoryChart(){
        const catCount = {};
        tasks.forEach(t=>{ const c=t.category||'Genel'; catCount[c]= (catCount[c]||0)+1; });
        const labels = Object.keys(catCount);
        const data = Object.values(catCount);
        if(categoryChart) categoryChart.destroy();
        categoryChart = new Chart(categoryChartEl,{
            type:'pie',
            data:{labels,datasets:[{data,backgroundColor:['#6d28d9','#10b981','#ef4444','#facc15','#3b82f6']}]},
            options:{responsive:true,plugins:{legend:{position:'bottom'}}}
        });
    }

    searchInput.addEventListener('input',render);
    filters.forEach(f=>f.addEventListener('click',()=>{ filters.forEach(b=>b.classList.remove('active')); f.classList.add('active'); filterMode=f.dataset.filter; render(); }));
    calendarDate.addEventListener('change',render);
    clearCompletedBtn.addEventListener('click',()=>{ if(confirm('Tamamlananları sil?')) clearCompleted(); });
    themeToggle.addEventListener('click',()=>{ themeDark=!themeDark; document.body.classList.toggle('dark',themeDark); save(); });
    exportBtn.addEventListener('click',()=>{ const blob = new Blob([JSON.stringify({tasks},null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='tasks_backup.json'; a.click(); URL.revokeObjectURL(url); });
    importFile.addEventListener('change', e=>{ const file = e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(data.tasks){tasks=data.tasks; save(); render(); toastShow('Görevler yüklendi');} }catch{ toastShow('Hatalı dosya');}}; reader.readAsText(file); });

    if("Notification" in window){ Notification.requestPermission(); }

    load(); render();
});
