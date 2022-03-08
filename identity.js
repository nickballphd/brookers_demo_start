

let current_menu=[]
const base=window.location.protocol + "//" + window.location.host + "/"



async function post_data(payload){
    //This function is used to invoke a function in Google App Script to interact with Airtable. This is desireable so that we can isolate the information needed to interact with the data from the client browser.
    working()//This function is used to present a visual cue to the user that the site is performing an update.
    if(document.cookie){//cookies are used to manage authenticated user information. The cookies are sent to Google App Script to ensure that users have appropriate authication and credentials update the database.
      payload.cookie=document.cookie
    }
    console.log("const payload=`" + JSON.stringify(payload) + "`")//This is primarily useful for troubleshooting. The data passed to Google App Script is sent to the console.
    //The request for Google App Script is formatted.
    const reply = await fetch(gas_end_point, { 
        method: "POST", 
        body: JSON.stringify(payload),
    })
    //The request is made of Google App Script and the response is set to "response"
    const response = await reply.json()
    working(false)
    console.log("in post data", response)     

    if(response.cookie){// if respoonse has a cookie, set it
        for(const entry of response.cookie){
            console.log("cookie returned",entry.name,"=",entry.data)
            set_cookie(entry.name,entry.data,response.cookie_days)
        }
    }
    //the response from google app script is returned.
    return response
}


async function initialize_app(){
    //This function initializes the page when it is loaded.
    let state="{}"
    window.onpopstate = function (event) {
        // call the function built into the URL
        navigate(event.state)
        //window[event.state.fn](event.state)
    };
    //If the user is authenticated, populate the authenticated menu is loaded. Otherwise the unautheticated menu is loaded.
    if(get_cookie("auth")){
        build_menu(authenticated_menu)
    }else{
        console.log('about to build menu')
        build_menu(unauthenticated_menu)
        console.log('just built menu')
    }
    //setup the page to interact well with browser features.
    const params = url_parameters()
    history.replaceState(params,"",location.href)
    console.log("params->",params)
    navigate(params,false,false)

}


function navigate(parameters, show_url=true, place_in_browser_history=true){
    //update history so we can navigate backward.  
    //update location so we can refresh and copy the URL.
    //any function called with navigate should build the whole canvas

    // if parameters is a string, parse it, otherwise, it's alread an object of parameters
    console.log('===========================parameters',parameters)
    if(typeof parameters ==="string"){

        var params=JSON.parse(parameters)

    }else{
        var params=parameters
        console.log('===============params',params)
    }
    if(place_in_browser_history){
      const url=location.href.split("?")[0] + "?" + json_params_for_url(params)
      if(show_url){
        history.pushState(params, "", url);
      }else{
        history.pushState(params, "", null);
      }
    }

    let fn=params.fn
    if(typeof fn === "string"){
        fn=window[fn] // convert a string to function
    }

    delete(params.fn)
    if(Object.keys(params).length===0){
        //if params is an empty object, don't send params
        fn()
    }else{
        if(params.params){
          fn(params.params)
        }else{
          fn(params)
        }  
    }
    
}


function json_params_for_url(params){ // encode an object without the trailing equalsigns
    const data=btoa(JSON.stringify(params))
    if(data.slice(-2)==="=="){
        return data.slice(0, -2)
    }
    
    if(data.slice(-1)==="="){
        return data.slice(0, -1)
    }
    
    return data    
}

async function submit_form(form){//this function is not used, but could be used to submit form data to google app script to update Airtable.
    return await post_data(form_data(form))
}

function form_data(html_tag,spin){
    // read the informatoin from a form and put it into an object, ready to be sent to post_data
    const payload={}// the object to return with the form's values
    // if the html_tag sent it is a button, and spin is true, change the button's text to a spinner
    if(html_tag.tagName==="BUTTON"){
        payload.button=html_tag.innerHTML  // record the button that was pressed.  This will be useful when there are many buttons on a form and you need to know which a user pressed
        if(spin){
          html_tag.innerHTML='<i class="fas fa-spinner fa-pulse"></i>'
        }
    }

    // search up the html element hierarchy to find the form
    while(html_tag.tagName !== "FORM"){
        console.log('html_tag',html_tag)
        html_tag=html_tag.parentElement
        if(html_tag.tagName==="BODY"){
            throw 'Object submitted is not a form and us not contained in a form.'; 
        }
    }

    // now we know that html_tag is a form, so read the values and bulid the object
    for(const element of html_tag.elements){
        console.log(element.tagName, element)
        if((element.tagName==="INPUT" || element.tagName==="SELECT" ||  element.tagName==="TEXTAREA") && element.name){
            // it's a tag with data
            if(!payload[element.name]){
                // the named data element has not yet been added to the payload; add it.
                payload[element.name]=[]
            }
            if(element.value){
                payload[element.name].push(element.value)
            }else{
                payload[element.name].push(element.innerHTML)
            }
        }
    }

    // look across payload and any data elements that have only one entry, make them variables instead of arrays
    for(const key of Object.keys(payload)){
        if(payload[key].length===1){
            payload[key]=payload[key][0]
        }
    }
    return payload
}






function url_parameters(){
    if(!location.search){
        return {fn:"show_home"}  
    }else if(location.search.includes("=")){
        // normal pairs of parameters
        var pairs = location.search.slice(1).split('&');
    
        var result = {};
        pairs.forEach(function(pair) {
            pair = pair.split('=');
            result[pair[0]] = decodeURIComponent(pair[1] || '');
        });
    
        return JSON.parse(JSON.stringify(result));
    }else if(location.search){
        // this must be a base 64 encoded json object
        return JSON.parse(atob(location.search.substr(1)))
    }
}


function set_cookie(name,value,days) {//used to update cookie information
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function get_cookie(name) {//used to retrieve cookie by name
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function erase_cookie(name) {//used to delete a cookie by name
    console.log("at erase cookie", name)
    set_cookie(name,"deleted",-2)
    //document.cookie = name+'=; Max-Age=-99999999;';  
}

function build_menu(menu_data){
    current_menu.length=0 // reset the current menu
    const menu=[]
    const user_data=get_user_data() || []
    
    menu.push('<div><i id="menu-close" class="fas fa-times" onclick="hide_menu()" style="cursor: pointer;"></i></div>  ')
    for(const item of menu_data){
        add_menu_item(menu, item, user_data.roles)
    }
    console.log('menu_data',menu_data)
    tag("menu").innerHTML=menu.join("")
}

function add_menu_item(menu, menu_data, roles){//used to add a menu item
    if(menu_data.menu && !menu_data.label){
        // it must be an import of another menu
        for(const item of menu_data.menu){
            add_menu_item(menu, item, roles) 
        }
        return
    }

    if(Object.keys(menu_data).length===0){
        // empty object, it's a divider
        menu.push("<div><hr></div>")
        return
    }
    if(menu_data.roles){
        // a role is specified, if role is not in the users set of roles, get out of here
        console.log("roles", roles)
        console.log("intersect(roles, menu_data.roles)",intersect(roles, menu_data.roles))
        console.log("menu_data.roles",menu_data.roles)
        if(intersect(roles, menu_data.roles).length===0){
            return
        }
    }
    if(menu_data.menu){
        // it's a submenu
        let label=menu_data.label
        
        if(typeof label==="function"){label=label()}

        menu.push(`<div class="menu-menu" onClick="toggle_sub_menu(this, 'menu-${menu_data.id}')"><i class="fas fa-chevron-down"></i>${label}</div><div class="sub-menu" id="menu-${menu_data.id}">`)
        for(const item of menu_data.menu){
            add_menu_item(menu, item, roles)
        }
        menu.push("</div>")
    }else{
        //this is a menu choice
        if(menu_data.function){
            current_menu.push(menu_data)
            let label=menu_data.label
            if(typeof label!=="string"){
                label=label()
            }
            menu.push(`<div class="menu-item" onClick="${menu_data.function}">${label}</div>`)
        }else{
            menu.push(`<div class="menu-item">${menu_data.label}</div>`)
        }
        if(menu_data.panel){
            menu.push(`<div  class="menu-panel" style="display:none" id="${menu_data.panel}"></div>`)
        }
    }
}

function show_menu(){//This function displays the menu
    tag("menu-button").style.display="none"
    tag("menu").style.display="block"
}
function hide_menu(){//Used to hide the menu (show only the parallel lines)
    tag("menu-button").style.display="block"
    tag("menu").style.display="none"
}
function click_menu(){//not used
    alert("hello")
}
function tag(id){//Adds an ID to an HTML element
    return document.getElementById(id)
}
function toggle_sub_menu(button, id){//Used to expande and collapse submenus
    if(toggle(id)){
        button.getElementsByTagName("i")[0].className="fas fa-chevron-up"
    }else{
        button.getElementsByTagName("i")[0].className="fas fa-chevron-down"
    }
}
function working(status=true){//used to present a visual cue (spinning wheel) to show that the app is processing
    try{  
        if(status){
            tag("hamburger").className="fas fa-spinner fa-pulse"
            tag("menu-close").className="fas fa-spinner fa-pulse"
        }else{
            tag("hamburger").className="fas fa-bars"
            tag("menu-close").className="fas fa-times"
        }
    }catch(e){
        console.error(e)        
    }
}
function toggle(tag_or_id,display="block"){
    
    
    let element=tag_or_id
    if(!element.tagName){
        // assume caller passed in a tag id, as tag_or_id 
        // does not have a tag name it cannot be a tag
        element=tag(tag_or_id)
    }

console.log("element", element)
    if(element.style && element.style.display===display){
        element.style.display="none"
        return false
    }else{
        element.style.display=display
        return true
    }
}
function f1(){//not used
    alert("hello")
}

function show_message(message, tag_or_id, seconds){//used to display alerts to the user. The alert can be set to disappear after a specified number of seconds.
  console.log("at show message", tag_or_id, message)

  let element=tag_or_id
  if(!element.tagName){
      // assume caller passed in a tag id
      element=tag(tag_or_id)
  }

  element.style.display="block"
  element.innerHTML=message
   if(seconds && seconds>0){
     setTimeout(function(){element.style.display="none";element.innerHTML=""}, seconds * 1000);
   }
}


function intersect(string_or_array, array_or_string) {// returns the intersection of two arrays
    if(Array.isArray(string_or_array)){
      var a=string_or_array
    }else{
      var a=[string_or_array]
    }

    if(Array.isArray(array_or_string)){
      var b=array_or_string
    }else{
      var b=[array_or_string]
    }

    var setB = new Set(b);
    return [...new Set(a)].filter(x => setB.has(x));
}

