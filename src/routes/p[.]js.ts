import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/p.js")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const base = `${url.protocol}//${url.host}`;

        const script = `(function(){
  var d=document,s=d.currentScript||d.querySelector('script[data-id]');
  if(!s)return;
  var id=s.getAttribute('data-id');
  if(!id)return;
  var endpoint='${base}/api/public/collect';
  var sid=sessionStorage.getItem('__pulse_sid');
  if(!sid){sid=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem('__pulse_sid',sid);}
  var lastPath=location.pathname+location.search;
  function send(ev,path,ref){var x=new XMLHttpRequest();x.open('POST',endpoint,true);x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({id:id,sid:sid,path:path||lastPath,referrer:ref||document.referrer,event:ev}));}
  function view(){lastPath=location.pathname+location.search;send('view',lastPath);}
  view();
  var origPush=history.pushState,origReplace=history.replaceState;
  history.pushState=function(){origPush.apply(history,arguments);view();};
  history.replaceState=function(){origReplace.apply(history,arguments);view();};
  window.addEventListener('popstate',view);
  var pingId=setInterval(function(){if(document.visibilityState==='visible')send('ping');},15000);
  function end(){clearInterval(pingId);send('end');}
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')end();});
  window.addEventListener('pagehide',end);
})();`;

        return new Response(script, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
