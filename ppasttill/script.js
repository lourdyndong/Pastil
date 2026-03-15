let products = JSON.parse(localStorage.getItem("products")) || [];
let orders = JSON.parse(localStorage.getItem("orders")) || [];

let currentProduct = null;

function saveData(){
localStorage.setItem("products", JSON.stringify(products));
localStorage.setItem("orders", JSON.stringify(orders));
}

function loadProducts(){

let container=document.getElementById("products");

if(!container) return;

container.innerHTML="";

products.forEach(p=>{

let card=document.createElement("div");
card.className="card";

card.innerHTML=`
<img src="${p.image}">
<h3>${p.name}</h3>
<p>₱${p.price}</p>
<button onclick="openOrder(${p.id})">Order</button>
<button onclick="deleteProduct(${p.id})">Delete</button>
`;

container.appendChild(card);

});

loadAdminProducts();

}

function openOrder(id){

currentProduct=products.find(p=>p.id==id);

document.getElementById("orderProduct").innerText=currentProduct.name;

let addonList=document.getElementById("addonList");
addonList.innerHTML="";

currentProduct.addons.forEach(a=>{

addonList.innerHTML+=`
<label>
<input type="checkbox" class="addonCheck" value="${a.price}">
${a.name} (+₱${a.price})
</label>
`;

});

document.getElementById("quantity").value=1;

calculateTotal();

document.getElementById("orderModal").style.display="block";

document.querySelectorAll(".addonCheck").forEach(c=>{
c.addEventListener("change",calculateTotal);
});

document.getElementById("quantity").addEventListener("input",calculateTotal);

}

function closeModal(){
document.getElementById("orderModal").style.display="none";
}

function calculateTotal(){

let qty=parseInt(document.getElementById("quantity").value);

let total=currentProduct.price * qty;

document.querySelectorAll(".addonCheck:checked").forEach(a=>{
total+=parseInt(a.value);
});

document.getElementById("total").innerText=total;

}

function submitOrder(){

let name=document.getElementById("customerName").value;
let qty=document.getElementById("quantity").value;
let payment=document.getElementById("payment").value;
let total=document.getElementById("total").innerText;

let order={
customer:name,
product:currentProduct.name,
quantity:qty,
payment:payment,
total:total
};

orders.push(order);

saveData();

sendTelegram(order);

alert("Order sent!");

closeModal();

}

function addProduct(){

let name=document.getElementById("pname").value;
let price=document.getElementById("pprice").value;
let file=document.getElementById("pimage").files[0];

let reader=new FileReader();

reader.onload=function(e){

products.push({
id:Date.now(),
name:name,
price:price,
image:e.target.result,
addons:[]
});

saveData();

loadProducts();

};

if(file) reader.readAsDataURL(file);

}

function deleteProduct(id){

products=products.filter(p=>p.id!=id);

saveData();

loadProducts();

}

function loadAdminProducts(){

let select=document.getElementById("addonProduct");

if(!select) return;

select.innerHTML="";

products.forEach(p=>{

let opt=document.createElement("option");

opt.value=p.id;

opt.textContent=p.name;

select.appendChild(opt);

});

}

function addAddon(){

let pid=document.getElementById("addonProduct").value;

let name=document.getElementById("addonName").value;

let price=document.getElementById("addonPrice").value;

let product=products.find(p=>p.id==pid);

product.addons.push({
name:name,
price:price
});

saveData();

alert("Add-on added");

}

function loadOrders(){

let div=document.getElementById("orders");

if(!div) return;

div.innerHTML="";

orders.forEach(o=>{

div.innerHTML+=`
<p>${o.customer} ordered ${o.product} (x${o.quantity}) - ₱${o.total}</p>
`;

});

}

function sendTelegram(order){

const token = "8183092011:AAFh8FCLFEdhIeD3k77xAkHGgSqEWZR9qlc";
const chatId = "6958159806";

const message =
`NEW ORDER - PASTILAN NI EMIK

Customer: ${order.customer}
Product: ${order.product}
Quantity: ${order.quantity}
Payment: ${order.payment}
Total: ₱${order.total}`;

fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
chat_id:chatId,
text:message
})
});

}

loadProducts();
loadOrders();