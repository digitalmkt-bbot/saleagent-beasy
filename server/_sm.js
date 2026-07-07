const Module=require('module');const bcrypt=require('bcryptjs');const H=bcrypt.hashSync('password',10);const o=Module._load;
Module._load=function(r,p,m){if(r==='pg'){return{Pool:class{on(){}async connect(){return{query:async()=>({rows:[{id:1}]}),release(){}}}async query(t){t=t.replace(/\s+/g,' ');
 if(/FROM app_user WHERE email/.test(t))return{rows:[{id:1,company_id:1,display_name:'A',role:'admin',password_hash:H}]};
 if(/FROM quotation WHERE id/.test(t))return{rows:[{id:1,company_id:1,grand_total:1000,project_id:1,customer_id:1}]};
 return{rows:[{id:1,name:'x',winRate:50,won:2,open:2,tags:[]}]};}}};}return o.apply(this,arguments);};
process.env.DATABASE_URL='x';process.env.JWT_SECRET='t';process.env.PORT='4997';require('./src/index.js');
setTimeout(async()=>{const B='http://localhost:4997';const j=async r=>[r.status,await r.json().catch(()=>({}))];
 const[,lg]=await j(await fetch(B+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'a',password:'password'})}));
 const h={Authorization:'Bearer '+lg.token};const out=[];
 for(const[m,p] of [['GET','/api/reports/summary'],['GET','/api/saleorders'],['POST','/api/saleorders/from-quotation/1']]){
   const[s]=await j(await fetch(B+p,{method:m,headers:h}));out.push([p,s]);}
 out.forEach(r=>console.log(r[0],'->',r[1]));
 const bad=out.filter(r=>r[1]>=500);console.log(bad.length?'FAIL':'ALL OK');process.exit(bad.length?1:0);},700);
