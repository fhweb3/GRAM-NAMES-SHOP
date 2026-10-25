(() => {
"use strict";
const cfg = window.APP_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
 !cfg.SUPABASE_URL.includes("PASTE_") && !cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tg = "https://t.me/fhvip3";
let db = null, allRows = [], allCategories = [], currentPage = 1, pageSize = 12, activeStatus = "", csvRows = [], adminUser = null;
const money = v => v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString(undefined,{maximumFractionDigits:4});
const statusClass = s => s === "Available" ? "status-available" : s === "Sold" ? "status-sold" : "status-offer";
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function showMessage(id,msg,kind="success"){const e=$(id);if(e){e.textContent=msg;e.style.color=kind==="error"?"var(--danger)":"var(--green)"}}
function setup(){
 $("adminOpen").addEventListener("click",openAdmin);
 document.querySelectorAll("[data-close]").forEach(e=>e.addEventListener("click",closeAdmin));
 document.querySelectorAll(".stat-card").forEach(b=>b.addEventListener("click",()=>{activeStatus=b.dataset.status;$("statusFilter").value=activeStatus;currentPage=1;renderPublic();document.querySelectorAll(".stat-card").forEach(x=>x.classList.toggle("active",x===b));$("listingTitle").textContent=activeStatus||"All usernames";$("usernameGrid").scrollIntoView({behavior:"smooth",block:"start"})}));
 ["searchInput","categoryFilter","statusFilter","lengthFilter","sortFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",()=>{currentPage=1;activeStatus=$("statusFilter").value;document.querySelectorAll(".stat-card").forEach(x=>x.classList.toggle("active",x.dataset.status===activeStatus));$("listingTitle").textContent=activeStatus||"All usernames";renderPublic()}));
 $("clearSearch").onclick=()=>{$("searchInput").value="";currentPage=1;renderPublic()};
 $("clearCategory").onclick=()=>{$("categoryFilter").value="";currentPage=1;renderPublic()};
 $("resetFilters").onclick=resetFilters;
 $("prevPage").onclick=()=>{if(currentPage>1){currentPage--;renderPublic()}};
 $("nextPage").onclick=()=>{currentPage++;renderPublic()};
 $("loginForm").addEventListener("submit",login);
 $("logoutBtn").onclick=logout;
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
 $("usernameForm").addEventListener("submit",saveUsername);
 $("cancelEdit").onclick=resetEntryForm;
 $("refreshAdmin").onclick=loadAdminRows;
 $("refreshArchive").onclick=loadArchive;
 $("categoryForm").addEventListener("submit",addCategory);
 $("csvFile").addEventListener("change",readCsv);
 $("importBtn").onclick=importCsv;
 if(!configured){$("resultCount").textContent="Setup required";$("usernameGrid").innerHTML='<div class="loading-card">Website preview is ready. Connect Supabase using the setup guide in README.md to load real inventory and enable admin features.</div>';renderLocalPreview();return}
 if(!window.supabase){$("usernameGrid").innerHTML='<div class="loading-card">Could not load the database client. Check your internet connection.</div>';return}
 db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 loadPublic();
 db.auth.onAuthStateChange((_event,session)=>{adminUser=session?.user||null;if(adminUser)showDashboard();else showLogin()});
}
function renderLocalPreview(){
 const demo=[
 {id:"demo1",username:"alpha1",category:{name:"Alpha"},status:"Available",price:10,created_at:new Date().toISOString()},
 {id:"demo2",username:"coolname",category:{name:"Premium"},status:"Offer Received",price:25.5,created_at:new Date().toISOString()},
 {id:"demo3",username:"gramx7",category:{name:"Short"},status:"Sold",price:15,created_at:new Date().toISOString()},
 {id:"demo4",username:"name123",category:{name:"Gaming"},status:"Available",price:5,created_at:new Date().toISOString()}
 ];
 allRows=demo;allCategories=[...new Set(demo.map(r=>r.category.name))].map(name=>({name}));
 updateStats();populateCategoryFilter();renderFolders();renderPublic();
}
async function loadPublic(){
 $("usernameGrid").innerHTML='<div class="loading-card">Loading usernames…</div>';
 try{
  const [catRes,rowRes]=await Promise.all([
   db.from("categories").select("id,name").order("name"),
   db.from("usernames").select("id,username,status,price,created_at,category_id,categories(id,name)").eq("is_archived",false).order("created_at",{ascending:false}).limit(10000)
  ]);
  if(catRes.error)throw catRes.error;if(rowRes.error)throw rowRes.error;
  allCategories=catRes.data||[];allRows=(rowRes.data||[]).map(r=>({...r,category:r.categories||allCategories.find(c=>c.id===r.category_id)||{name:"Uncategorized"}}));
  updateStats();populateCategoryFilter();renderFolders();renderPublic();
 }catch(e){$("usernameGrid").innerHTML='<div class="loading-card">Could not load inventory. Check Supabase setup and database policies.</div>';console.error(e)}
}
function updateStats(){
 const rows=allRows.filter(r=>!r.is_archived);
 $("countAll").textContent=rows.length.toLocaleString();
 $("countAvailable").textContent=rows.filter(r=>r.status==="Available").length.toLocaleString();
 $("countOffer").textContent=rows.filter(r=>r.status==="Offer Received").length.toLocaleString();
 $("countSold").textContent=rows.filter(r=>r.status==="Sold").length.toLocaleString();
}
function populateCategoryFilter(){
 const old=$("categoryFilter").value;
 $("categoryFilter").innerHTML='<option value="">All categories</option>'+allCategories.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
 if([...$("categoryFilter").options].some(o=>o.value===old))$("categoryFilter").value=old;
 $("categoryOptions").innerHTML=allCategories.map(c=>`<option value="${esc(c.name)}"></option>`).join("");
}
function categoryCount(name){return allRows.filter(r=>!r.is_archived&&(r.category?.name||"Uncategorized")===name).length}
function renderFolders(){
 const active=allRows.filter(r=>!r.is_archived);
 const five=active.filter(r=>r.username.length===5).length;
 const fiveCats=allCategories.filter(c=>active.some(r=>r.username.length===5&&(r.category?.name||"Uncategorized")===c.name));
 const main=allCategories.filter(c=>active.some(r=>r.username.length>=6&&(r.category?.name||"Uncategorized")===c.name));
 const parent={name:"5 Characters",count:five,special:true};
 const items=[parent,...fiveCats.map(c=>({name:c.name,count:active.filter(r=>r.username.length===5&&(r.category?.name||"Uncategorized")===c.name).length,child:true})),...main.map(c=>({name:c.name,count:active.filter(r=>r.username.length>=6&&(r.category?.name||"Uncategorized")===c.name).length,special:false}))];
 const unique=items.filter((c,i)=>items.findIndex(x=>x.name===c.name&&!!x.child===!!c.child&&!!x.special===!!c.special)===i);
 $("categoryFolders").innerHTML=unique.length?unique.map(c=>`<button class="folder-card ${c.child?"folder-child":""} ${$("categoryFilter").value===c.name?"selected":""}" data-folder="${esc(c.name)}" data-special="${c.special?"parent":c.child?"child":"main"}"><span class="folder-emoji">${c.special?"🗂️":"📁"}</span><span><strong>${esc(c.name)}</strong><small>${c.count} username${c.count===1?"":"s"}${c.child?" · 5 characters":c.special?" · parent folder":""}</small></span></button>`).join(""):'<div class="empty-inline">Categories will appear here when inventory is added.</div>';
 $("categoryFolders").querySelectorAll("[data-folder]").forEach(b=>b.onclick=()=>{const name=b.dataset.folder,kind=b.dataset.special;if(kind==="parent"){$("lengthFilter").value="5";$("categoryFilter").value="";}else if(kind==="child"){$("categoryFilter").value=name;$ ("lengthFilter").value="5";}else{$("categoryFilter").value=name;$ ("lengthFilter").value="6";}currentPage=1;renderFolders();renderPublic();$("usernameGrid").scrollIntoView({behavior:"smooth",block:"start"})});
}
function filteredRows(){
 const q=$("searchInput").value.trim().toLowerCase(),cat=$("categoryFilter").value,status=$("statusFilter").value,len=$("lengthFilter").value;
 let rows=allRows.filter(r=>!r.is_archived);
 if(q)rows=rows.filter(r=>r.username.toLowerCase().includes(q)||(r.category?.name||"").toLowerCase().includes(q));
 if(cat)rows=rows.filter(r=>(r.category?.name||"Uncategorized")===cat);
 if(status)rows=rows.filter(r=>r.status===status);
 if(len==="5")rows=rows.filter(r=>r.username.length===5);
 if(len==="6")rows=rows.filter(r=>r.username.length>=6);
 if(len==="short")rows=rows.filter(r=>r.username.length<5);
 const sort=$("sortFilter").value;
 rows.sort((a,b)=>sort==="az"?a.username.localeCompare(b.username):sort==="za"?b.username.localeCompare(a.username):sort==="length"?a.username.length-b.username.length:sort==="priceAsc"?(a.price??Infinity)-(b.price??Infinity):sort==="priceDesc"?(b.price??-Infinity)-(a.price??-Infinity):new Date(b.created_at||0)-new Date(a.created_at||0));
 return rows;
}
function renderPublic(){
 const rows=filteredRows(),total=rows.length,pages=Math.max(1,Math.ceil(total/pageSize));if(currentPage>pages)currentPage=pages;
 $("resultCount").textContent=`${total.toLocaleString()} result${total===1?"":"s"}`;
 $("pageInfo").textContent=`Page ${currentPage} of ${pages}`;$("prevPage").disabled=currentPage<=1;$("nextPage").disabled=currentPage>=pages;
 $("emptyState").classList.toggle("hidden",total>0);$("usernameGrid").classList.toggle("hidden",total===0);
 const pageRows=rows.slice((currentPage-1)*pageSize,currentPage*pageSize);
 $("usernameGrid").innerHTML=pageRows.map(r=>`<article class="username-card"><div class="username-card-top"><div class="username-name">@${esc(r.username)}</div><span class="status-badge ${statusClass(r.status)}">${esc(r.status)}</span></div><div class="card-details"><div class="detail-row"><span>Category</span><strong>${esc(r.category?.name||"Uncategorized")}</strong></div><div class="detail-row"><span>Status</span><strong>${esc(r.status)}</strong></div><div class="detail-row"><span>Price</span><strong class="price">${money(r.price)}</strong></div><div class="detail-row"><span>Characters</span><strong>${r.username.length}</strong></div></div><a class="inquiry-btn" href="${tg}?text=${encodeURIComponent("Hi, I'm interested in the username @"+r.username+". Price: "+money(r.price))}" target="_blank" rel="noopener noreferrer">➤ Inquire on Telegram · @fhvip3</a></article>`).join("");
 renderFolders();
}
function resetFilters(){$("searchInput").value="";$("categoryFilter").value="";$("statusFilter").value="";$("lengthFilter").value="";$("sortFilter").value="newest";activeStatus="";currentPage=1;document.querySelectorAll(".stat-card").forEach(x=>x.classList.toggle("active",x.dataset.status===""));$("listingTitle").textContent="All usernames";renderPublic()}
function openAdmin(){$("adminModal").classList.remove("hidden");if(!configured){$("loginView").classList.remove("hidden");$("dashboardView").classList.add("hidden");$("loginError").textContent="Set your Supabase URL and anon key in config.js first.";return}db.auth.getSession().then(({data})=>{if(data.session)showDashboard();else showLogin()})}
function closeAdmin(){$("adminModal").classList.add("hidden")}
function showLogin(){$("loginView").classList.remove("hidden");$("dashboardView").classList.add("hidden")}
async function login(e){e.preventDefault();$("loginError").textContent="";const {error}=await db.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});if(error){$("loginError").textContent="Sign-in failed. Check your credentials and confirm this account is authorized.";return}showDashboard()}
async function logout(){await db.auth.signOut();showLogin();toast("Signed out")}
async function showDashboard(){
 if(!db)return;
 const {data:{user}}=await db.auth.getUser();if(!user)return;
 const {data:admin,error}=await db.from("admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(error||!admin){await db.auth.signOut();$("loginError").textContent="This account is not authorized as an admin.";showLogin();return}
 adminUser=user;$("loginView").classList.add("hidden");$("dashboardView").classList.remove("hidden");$("adminIdentity").textContent=user.email||"Authorized admin";await Promise.all([loadAdminRows(),loadArchive(),loadCategoriesAdmin()]);
}
function switchTab(tab){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));document.querySelectorAll(".admin-tab").forEach(s=>s.classList.toggle("hidden",s.id!=="tab-"+tab));if(tab==="archive")loadArchive();if(tab==="categories")loadCategoriesAdmin()}
async function loadAdminRows(){
 if(!db)return;const {data,error}=await db.from("usernames").select("id,username,status,price,is_archived,created_at,category_id,categories(name)").eq("is_archived",false).order("created_at",{ascending:false}).limit(5000);
 if(error){showMessage("globalAdminMessage","Could not load admin inventory: "+error.message,"error");return}
 const rows=data||[];$("adminRows").innerHTML=rows.map(r=>`<tr><td>@${esc(r.username)}</td><td>${esc(r.categories?.name||"")}</td><td>${esc(r.status)}</td><td>${money(r.price)}</td><td><button data-edit="${r.id}">Edit</button><button data-archive="${r.id}">Archive</button></td></tr>`).join("")||'<tr><td colspan="5">No active usernames yet.</td></tr>';
 $("adminRows").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editEntry(rows.find(r=>r.id===b.dataset.edit)));
 $("adminRows").querySelectorAll("[data-archive]").forEach(b=>b.onclick=()=>archiveEntry(b.dataset.archive));
}
function editEntry(r){if(!r)return;$("entryId").value=r.id;$("entryUsername").value=r.username;$("entryCategory").value=r.categories?.name||"";$("entryStatus").value=r.status;$("entryPrice").value=r.price??"";$("editTitle").textContent="Edit username";$("cancelEdit").classList.remove("hidden");switchTab("manage");$("entryUsername").focus()}
function resetEntryForm(){$("usernameForm").reset();$("entryId").value="";$("editTitle").textContent="Add username";$("cancelEdit").classList.add("hidden");$("entryStatus").value="Available";showMessage("entryMessage","")}
async function getOrCreateCategory(name){
 name=name.trim();if(!name)throw new Error("Category is required.");
 let {data,error}=await db.from("categories").select("id,name").ilike("name",name).limit(1).maybeSingle();if(error)throw error;if(data)return data;
 const res=await db.from("categories").insert({name}).select("id,name").single();if(res.error){const retry=await db.from("categories").select("id,name").ilike("name",name).limit(1).maybeSingle();if(retry.data)return retry.data;throw res.error}return res.data;
}
async function saveUsername(e){
 e.preventDefault();const username=$("entryUsername").value.trim(),catName=$("entryCategory").value.trim(),status=$("entryStatus").value,raw=$("entryPrice").value;
 if(!username||!catName)return showMessage("entryMessage","Username and category are required.","error");
 const price=raw===""?null:Number(raw);if(price!==null&&(!Number.isFinite(price)||price<0))return showMessage("entryMessage","Enter a valid non-negative price.","error");
 try{const cat=await getOrCreateCategory(catName);const payload={username,category_id:cat.id,status,price};
 const id=$("entryId").value;const res=id?await db.from("usernames").update(payload).eq("id",id):await db.from("usernames").insert(payload);
 if(res.error)throw res.error;showMessage("entryMessage","Username saved.");resetEntryForm();await Promise.all([loadAdminRows(),loadPublic(),loadCategoriesAdmin()]);toast("Username saved");
 }catch(err){showMessage("entryMessage",err.code==="23505"?"That username already exists.":err.message||"Could not save username.","error")}
}
async function archiveEntry(id){if(!confirm("Archive this username? It will disappear from the public site but can be restored."))return;const {error}=await db.from("usernames").update({is_archived:true}).eq("id",id);if(error){toast("Archive failed: "+error.message);return}await Promise.all([loadAdminRows(),loadPublic()]);toast("Username archived")}
async function loadArchive(){if(!db)return;const {data,error}=await db.from("usernames").select("id,username,status,price,categories(name)").eq("is_archived",true).order("archived_at",{ascending:false}).limit(5000);if(error){showMessage("globalAdminMessage",error.message,"error");return}const rows=data||[];$("archiveRows").innerHTML=rows.map(r=>`<tr><td>@${esc(r.username)}</td><td>${esc(r.categories?.name||"")}</td><td>${esc(r.status)}</td><td>${money(r.price)}</td><td><button data-restore="${r.id}">Restore</button><button class="action-danger" data-delete="${r.id}">Delete</button></td></tr>`).join("")||'<tr><td colspan="5">No archived usernames.</td></tr>';$("archiveRows").querySelectorAll("[data-restore]").forEach(b=>b.onclick=()=>restoreEntry(b.dataset.restore));$("archiveRows").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteEntry(b.dataset.delete))}
async function restoreEntry(id){const {error}=await db.from("usernames").update({is_archived:false}).eq("id",id);if(error){toast("Restore failed: "+error.message);return}await Promise.all([loadArchive(),loadAdminRows(),loadPublic()]);toast("Username restored")}
async function deleteEntry(id){if(!confirm("Permanently delete this username? This cannot be undone."))return;const {error}=await db.from("usernames").delete().eq("id",id);if(error){toast("Delete failed: "+error.message);return}await Promise.all([loadArchive(),loadPublic()]);toast("Username deleted")}
async function loadCategoriesAdmin(){if(!db)return;const {data,error}=await db.from("categories").select("id,name,created_at").order("name");if(error)return;allCategories=data||[];populateCategoryFilter();renderFolders();$("adminCategories").innerHTML=allCategories.map(c=>`<div class="admin-category-row"><span>📁 ${esc(c.name)}</span><button class="action-danger" data-catdelete="${c.id}">Delete</button></div>`).join("")||'<p class="muted">No categories yet.</p>';$("adminCategories").querySelectorAll("[data-catdelete]").forEach(b=>b.onclick=()=>deleteCategory(b.dataset.catdelete))}
async function addCategory(e){e.preventDefault();const name=$("newCategory").value.trim();if(!name)return;const {error}=await db.from("categories").insert({name});if(error){showMessage("categoryMessage",error.code==="23505"?"That category already exists.":error.message,"error");return}$("newCategory").value="";showMessage("categoryMessage","Category added.");await Promise.all([loadCategoriesAdmin(),loadPublic()])}
async function deleteCategory(id){if(!confirm("Delete this category? It can only be deleted if no usernames use it."))return;const {error}=await db.from("categories").delete().eq("id",id);if(error){toast("Could not delete category. Move its usernames first.");return}await Promise.all([loadCategoriesAdmin(),loadPublic()]);toast("Category deleted")}
function parseCSV(text){
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(quoted){if(c==='"'&&n==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===","){row.push(field);field=""}else if(c==="\n"){row.push(field);rows.push(row);row=[];field=""}else if(c!=="\r")field+=c}
 if(field.length||row.length){row.push(field);rows.push(row)}
 const clean=rows.filter(r=>r.some(v=>v.trim()!==""));if(!clean.length)throw new Error("The CSV file is empty.");
 const headers=clean.shift().map(h=>h.trim().toLowerCase());const required=["username","category","status","price"];const missing=required.filter(h=>!headers.includes(h));if(missing.length)throw new Error("Missing required headers: "+missing.join(", "));
 return clean.map((r,i)=>{const o={};headers.forEach((h,j)=>o[h]=(r[j]||"").trim());o._row=i+2;return o});
}
async function readCsv(){
 const f=$("csvFile").files[0];csvRows=[];$("importBtn").disabled=true;if(!f){$("csvPreview").textContent="Select a CSV file to preview rows before importing.";return}
 try{csvRows=parseCSV(await f.text());const invalid=csvRows.filter(r=>!r.username||!r.category||!["Available","Offer Received","Sold"].includes(r.status)||(r.price!==""&&(!Number.isFinite(Number(r.price))||Number(r.price)<0)));
 $("csvPreview").innerHTML=`<strong>${csvRows.length} rows found.</strong> ${invalid.length?`<span class="error-text">${invalid.length} invalid row(s) will be skipped.</span>`:"All rows pass basic validation."}<br>Preview: ${csvRows.slice(0,5).map(r=>`@${esc(r.username)} · ${esc(r.category)} · ${esc(r.status)} · ${esc(r.price||"—")}`).join(" | ")}`;
 $("importBtn").disabled=csvRows.length===0;
 }catch(e){$("csvPreview").textContent=e.message;csvRows=[]}
}
async function importCsv(){
 if(!csvRows.length||!db)return;$("importBtn").disabled=true;let added=0,updated=0,skipped=0,failed=0;const mode=$("duplicateMode").value;const errors=[];
 for(let i=0;i<csvRows.length;i++){
  const r=csvRows[i];if(!r.username||!r.category||!["Available","Offer Received","Sold"].includes(r.status)||(r.price!==""&&(!Number.isFinite(Number(r.price))||Number(r.price)<0))){failed++;errors.push(`Row ${r._row}: invalid data`);continue}
  try{
   const cat=await getOrCreateCategory(r.category);
   const payload={username:r.username,category_id:cat.id,status:r.status,price:r.price===""?null:Number(r.price)};
   const existing=await db.from("usernames").select("id").ilike("username",r.username).limit(1).maybeSingle();
   if(existing.error)throw existing.error;
   if(existing.data){if(mode==="skip"){skipped++;continue}const res=await db.from("usernames").update({...payload,is_archived:false}).eq("id",existing.data.id);if(res.error)throw res.error;updated++}
   else{const res=await db.from("usernames").insert(payload);if(res.error)throw res.error;added++}
  }catch(e){failed++;errors.push(`Row ${r._row}: ${e.message||"import error"}`)}
  if(i%25===0){$("importMessage").textContent=`Processing ${i+1} of ${csvRows.length}…`}
 }
 $("importMessage").textContent=`Finished. Added: ${added}; updated: ${updated}; skipped: ${skipped}; failed: ${failed}.`+(errors.length?" First errors: "+errors.slice(0,5).join(" | "):"");
 await Promise.all([loadAdminRows(),loadPublic(),loadCategoriesAdmin(),loadArchive()]);$("importBtn").disabled=false;toast("CSV import finished");
}
document.addEventListener("DOMContentLoaded",setup);
})();