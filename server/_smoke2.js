const Module=require('module');const bcrypt=require('bcryptjs');const HASH=bcrypt.hashSync('password',10);
const orig=Module._load;
Module._load=function(r,p,m){if(r==='pg'){return{Pool:class{on(){}async connect(){return{query:async()=>({rows:[{id:1}]}),release(){}}}async query(t){t=t.replace(/\s+/g,' ');
 if(/FROM app_user WHERE email/.test(t))return{rows:[{id:1,company_id:1,display_name:'A',role:'admin',password_hash:HASH}]};
 if(/today.*upcoming.*overdue.*all/.test(t))return{rows:[{today:1,upcoming:2,overdue:1,all:4}]};
 if(/SELECT count\(\*\) FROM customer/.test(t))return{rows:[{count:'5'}]};
 if(/count\(\*\)::int total, count\(\*\) FILTER \(WHERE lifecycle_stage='target'\)/.test(t))return{rows:[{total:5,target:2,new:1,regular:1,lapsed:1,followed:4}]};
 if(/FROM pipeline_stage/.test(t))return{rows:[{id:1,seq:1,name:'x',is_won:false}]};
 if(/status='pending' AND a.due_at::date <= CURRENT_DATE/.test(t))return{rows:[{id:1,detail:'d',customer_name:'C',overdue:true}]};
 return{rows:[{id:1,name:'x',tags:[],stage_seq:1}]};}}};}return orig.apply(this,arguments);};
process.env.DATABASE_URL='x';process.env.JWT_SECRET='t';process.env.PORT='4998';require('./src/index.js');
setTimeout(async()=>{const B='http://localhost:4998';const j=async r=>[r.status,await r.json().catch(()=>({}))];
 const out=[];let[,lg]=await j(await fetch(B+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'a@a',password:'password'})}));
 const h={Authorization:'Bearer '+lg.token};
 for(const p of ['/api/activities?bucket=today&team=1&type=0&sort=priority','/api/customers?tag=1&priority=3&province=x','/api/projects?team=1&priority=3','/api/meta/notifications','/api/meta/activity-types','/api/meta/dashboard','/api/customers/1','/api/projects/1']){const[s]=await j(await fetch(B+p,{headers:h}));out.push([p,s]);}
 out.forEach(r=>console.log(r[0],'->',r[1]));
 const bad=out.filter(r=>r[1]>=500);console.log(bad.length?'\nFAIL '+bad.length:'\nALL OK (no 5xx)');process.exit(bad.length?1:0);},700);
