'use strict';

document.documentElement.classList.add('js');

const header=document.querySelector('[data-header]');
const menuButton=document.querySelector('[data-menu-button]');
const navigation=document.querySelector('[data-navigation]');
const progressBar=document.querySelector('.scroll-progress span');
const copyStatus=document.querySelector('[data-copy-status]');

function closeMenu({restoreFocus=false}={}){
    if(!menuButton || !navigation){
        return;
    }

    menuButton.setAttribute('aria-expanded','false');
    navigation.dataset.open='false';

    if(restoreFocus){
        menuButton.focus();
    }
}

menuButton?.addEventListener(
    'click',
    ()=>{
        const open=menuButton.getAttribute('aria-expanded')!=='true';
        menuButton.setAttribute('aria-expanded',String(open));
        navigation.dataset.open=String(open);
    }
);

navigation?.addEventListener(
    'click',
    event=>{
        if(event.target.closest('a')){
            closeMenu();
        }
    }
);

document.addEventListener(
    'click',
    event=>{
        if(
            menuButton?.getAttribute('aria-expanded')==='true' &&
            !navigation?.contains(event.target) &&
            !menuButton.contains(event.target)
        ){
            closeMenu();
        }
    }
);

document.addEventListener(
    'keydown',
    event=>{
        if(event.key==='Escape' && menuButton?.getAttribute('aria-expanded')==='true'){
            closeMenu({restoreFocus:true});
        }
    }
);

const desktopNavigation=window.matchMedia('(min-width: 52.001rem)');
desktopNavigation.addEventListener?.('change',event=>{
    if(event.matches){
        closeMenu();
    }
});

const tabs=[...document.querySelectorAll('[role="tab"]')];
const panels=[...document.querySelectorAll('[role="tabpanel"]')];

function selectTab(tab,{moveFocus=false}={}){
    const panelName=tab.dataset.tab;

    for(const candidate of tabs){
        const selected=candidate===tab;
        candidate.setAttribute('aria-selected',String(selected));
        candidate.tabIndex=selected ? 0 : -1;
    }

    for(const panel of panels){
        panel.hidden=panel.dataset.panel!==panelName;
    }

    if(moveFocus){
        tab.focus();
    }
}

for(const tab of tabs){
    tab.addEventListener('click',()=>selectTab(tab));
    tab.addEventListener(
        'keydown',
        event=>{
            if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
                return;
            }

            event.preventDefault();

            const current=tabs.indexOf(tab);
            let next=current;

            if(event.key==='ArrowLeft'){
                next=(current-1+tabs.length)%tabs.length;
            }

            if(event.key==='ArrowRight'){
                next=(current+1)%tabs.length;
            }

            if(event.key==='Home'){
                next=0;
            }

            if(event.key==='End'){
                next=tabs.length-1;
            }

            selectTab(tabs[next],{moveFocus:true});
        }
    );
}

function fallbackCopy(value){
    const helper=document.createElement('textarea');
    helper.value=value;
    helper.setAttribute('readonly','');
    helper.style.position='fixed';
    helper.style.inset='0 auto auto -9999px';
    helper.style.opacity='0';
    document.body.append(helper);
    helper.select();

    const copied=document.execCommand('copy');
    helper.remove();

    if(!copied){
        throw new Error('Copy command was not available.');
    }
}

async function copyText(value){
    if(navigator.clipboard?.writeText){
        try{
            await navigator.clipboard.writeText(value);
            return;
        }catch{
            fallbackCopy(value);
            return;
        }
    }

    fallbackCopy(value);
}

const copyTimers=new WeakMap();

function showCopyResult(button,message,{success=true}={}){
    const originalLabel=button.dataset.originalLabel||button.textContent;
    button.dataset.originalLabel=originalLabel;
    button.textContent=success ? 'Copied' : 'Select + copy';

    if(copyStatus){
        copyStatus.textContent=message;
    }

    const previousTimer=copyTimers.get(button);
    if(previousTimer){
        window.clearTimeout(previousTimer);
    }

    const timer=window.setTimeout(
        ()=>{
            button.textContent=originalLabel;
            if(copyStatus?.textContent===message){
                copyStatus.textContent='';
            }
        },
        1800
    );

    copyTimers.set(button,timer);
}

document.querySelector('[data-copy-current]')?.addEventListener(
    'click',
    async event=>{
        const panel=panels.find(candidate=>!candidate.hidden);
        const value=panel?.textContent.trim();

        if(!value){
            return;
        }

        try{
            await copyText(value);
            showCopyResult(event.currentTarget,'Quick-start example copied.');
        }catch{
            showCopyResult(event.currentTarget,'Copy was unavailable. Select the code manually.',{success:false});
        }
    }
);

for(const button of document.querySelectorAll('[data-copy-text]')){
    button.addEventListener(
        'click',
        async event=>{
            const value=event.currentTarget.dataset.copyText||'';

            try{
                await copyText(value);
                showCopyResult(event.currentTarget,'Install command copied.');
            }catch{
                showCopyResult(event.currentTarget,'Copy was unavailable. Select the command manually.',{success:false});
            }
        }
    );
}

const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems=[...document.querySelectorAll('.reveal')];

if(reduceMotion || !('IntersectionObserver' in window)){
    for(const item of revealItems){
        item.classList.add('is-visible');
    }
}else{
    const observer=new IntersectionObserver(
        entries=>{
            for(const entry of entries){
                if(!entry.isIntersecting){
                    continue;
                }

                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        },
        {rootMargin:'0px 0px -8%'}
    );

    for(const item of revealItems){
        observer.observe(item);
    }
}

let scrollFrame=0;

function updateScrollState(){
    scrollFrame=0;
    const available=document.documentElement.scrollHeight-window.innerHeight;
    const progress=available>0 ? window.scrollY/available : 0;

    if(progressBar){
        progressBar.style.transform=`scaleX(${Math.min(1,Math.max(0,progress))})`;
    }

    if(header){
        header.dataset.scrolled=String(window.scrollY>12);
    }
}

function requestScrollUpdate(){
    if(scrollFrame){
        return;
    }

    scrollFrame=window.requestAnimationFrame(updateScrollState);
}

window.addEventListener('scroll',requestScrollUpdate,{passive:true});
window.addEventListener('resize',requestScrollUpdate);
updateScrollState();

const year=document.querySelector('[data-year]');

if(year){
    year.textContent=new Date().getFullYear();
}
