export const KEY='dorm-care:v1';
export const labels={new:'待接手',pending:'待安排',scheduled:'已安排',working:'处理中',review:'待复查',closed:'已结案'};
export const readings=[65,64,68,72,70,67,69,73,75,72,70,71,73,76,80,82,79,75,73,72,74,76,77,78].map((humidity,i)=>({humidity,temp:Math.round((24.6+i*.074)*10)/10,time:new Date(Date.UTC(2026,8,12,3,35)+i*3600000).toISOString()}));
readings.at(-1).temp=26.3;
export const initial=()=>({version:1,revision:0,device:'online',event:{id:'DEMO-302-001',place:'衣柜背面',description:'衣柜背面摸起来潮湿，希望安排查看。',contact:'通过原型内进度页联系',availability:'9月14日 14:00–16:00',intent:true,status:'pending',photos:[],assignee:'',appointment:'',auth:'pending',scope:'room',facts:'',actions:'',unknown:'',reviewNote:'',feedback:null,history:[{at:'2026-09-13T02:12:00.000Z',actor:'学生',text:'提交反馈：衣柜背面潮湿。'},{at:'2026-09-13T02:20:00.000Z',actor:'管理端',text:'已接手，等待安排现场查看。'}]}});
const need=(condition,message)=>{if(!condition)throw Error(message)};
const str=(v)=>String(v??'').trim();
export function transition(state,action,p={},now=new Date().toISOString()){
 const next=structuredClone(state);const e=next.event;
 const log=(actor,text)=>e.history.push({at:now,actor,text});
 if(action==='device'){need(['online','offline','empty'].includes(p.value),'设备状态无效');next.device=p.value;}
 else if(action==='submit'){
  need(!e,'已有事件，请在进度页补充信息');
  for(const [k,n] of [['place','位置'],['description','现象描述'],['contact','联系偏好']])need(str(p[k]),`请填写${n}`);
  need(!p.intent||str(p.availability),'请填写可联系或入室时间');
  next.event={...initial().event,id:'DEMO-302-001',place:str(p.place),description:str(p.description),contact:str(p.contact),availability:str(p.availability),intent:!!p.intent,photos:p.photos||[],status:'new',history:[{at:now,actor:'学生',text:'提交反馈：'+str(p.description)}]};
 }else{
  need(e,'目前没有事件，请先提交反馈');
  if(action==='accept'){need(e.status==='new','该事件已接手');e.status='pending';log('管理端','已接手，等待安排现场查看。');}
  else if(action==='schedule'||action==='draft'){
   need(['pending','scheduled'].includes(e.status),'当前阶段不能修改安排');
   const data={assignee:str(p.assignee),appointment:str(p.appointment),auth:p.auth,scope:p.scope};
   need(['pending','confirmed'].includes(data.auth),'请选择授权状态');need(['room','public'].includes(data.scope),'请选择查看范围');
   if(action==='schedule'){need(data.assignee&&data.appointment,'请填写负责人和查看时间');need(Date.parse(data.appointment)>Date.parse(now),'查看时间需晚于当前时间');need(data.scope==='public'||data.auth==='confirmed','入室授权未确认，请先保存草稿并核实授权');e.status='scheduled';}
   if(action==='draft')e.status='pending';
   Object.assign(e,data);log('管理端',action==='draft'?'保存安排草稿，尚未完成排期。':`已安排${data.assignee}于${data.appointment.replace('T',' ')}查看${data.scope==='public'?'公共区域（无需入室）':'房间（授权已核实）'}。`);
  }else if(action==='start'){need(e.status==='scheduled','请先完成查看安排');need(e.scope==='public'||e.auth==='confirmed','入室授权未确认，不能开始执行');e.status='working';log('管理端','已开始现场查看。');}
  else if(action==='record'){
   need(e.status==='working','请先开始现场查看');need(str(p.facts)&&str(p.actions)&&str(p.unknown),'请分别填写现场事实、已采取行动和未知项；无未知项可填“暂无”');
   e.facts=str(p.facts);e.actions=str(p.actions);e.unknown=str(p.unknown);e.status='review';e.feedback=null;log('管理端','已记录现场处理，等待学生反馈与工作人员复查。');
  }else if(action==='feedback'){
   need(e.status==='review','当前尚未进入复查');need(['improved','persists'].includes(p.result),'请选择复查感受');need(str(p.note),'请说明当前观察到的情况');e.feedback={result:p.result,note:str(p.note),at:now};log('学生',`复查反馈：${p.result==='improved'?'目前已改善':'问题仍存在'}。${str(p.note)}`);
  }else if(action==='close'){
   need(e.status==='review','当前阶段不能结案');need(e.feedback?.result==='improved','需收到学生“目前已改善”的反馈；问题仍存在时请继续跟进');need(str(p.reviewNote),'请填写工作人员复查记录');e.reviewNote=str(p.reviewNote);e.status='closed';log('管理端','复查记录：'+e.reviewNote);log('管理端','本次事件已结案；再次出现问题仍可重新跟进。');
  }else if(action==='reopen'){
   need(['review','closed'].includes(e.status),'当前事件已在跟进中');need(str(p.note),'请填写继续跟进的原因');e.status='pending';e.auth='pending';e.assignee='';e.appointment='';e.feedback=null;log(p.actor==='student'?'学生':'管理端','重新跟进：'+str(p.note));
  }else if(action==='supplement'){need(e.status!=='closed','已结案事件请使用重新跟进');need(str(p.note),'请填写补充内容');log('学生','补充信息：'+str(p.note));}
  else throw Error('未知操作');
 }
 next.revision=(state.revision||0)+1;return next;
}
