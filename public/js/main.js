/* ============================================================
   BAHÍA — Home · interacciones premium
   ============================================================ */
(function(){
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Diccionario i18n ---- */
  var i18n = {
    es:{
      nav_inicio:'Inicio', nav_inst:'Instalaciones', nav_act:'Actividades', nav_amen:'Amenidades', nav_planes:'Planes', nav_contacto:'Contacto',
      nav_cta:'Agendar Visita',
      act_eyebrow:'Actividades', act_title:'Todo para moverte',
      act_sub:'Deporte de raqueta, fuerza y comunidad — en un mismo lugar.',
      act_tenis_t:'Tenis', act_padel_t:'Pádel', act_card_cta:'Conócelas',
      act_tenis_p:'Nuestras icónicas canchas rosas, en superficie firme y arcilla. El corazón visual y deportivo del club.',
      act_tenis_m1:'Superficie firme', act_tenis_m2:'Arcilla', act_cta:'Agendar visita',
      act_pick_t:'Pickleball', act_pick_p:'8 canchas profesionales para el deporte de mayor crecimiento — fácil de aprender, imposible de dejar.',
      act_gym_t:'Gimnasio', act_gym_p:'Equipo de última generación y fitness funcional, con luz natural y vista al verde.',
      amen_eyebrow:'Amenidades', amen_title:'Cada detalle, cuidado',
      amen_sub:'Espacios premium para antes y después de cada jugada.',
      amen_vest:'Vestidores', amen_reg:'Regaderas', amen_rest:'Restaurante & Terraza',
      foot_cal:'Agenda tu visita →',
      hero_tag:'Donde el deporte, la naturaleza y la buena vida se encuentran.',
      hero_cta1:'Agendar Visita', hero_cta2:'Conoce el club',
      scroll:'Descubre',
      esencia_eyebrow:'¿Qué es Bahía?',
      esencia_title:'Un club para vivir, no solo para entrenar.',
      esencia_p1:'Combinamos pádel, tenis y pickleball con gimnasio, áreas sociales y amenidades pensadas para enriquecer el estilo de vida de cada miembro.',
      esencia_p2:'Instalaciones de vanguardia, atención impecable y una atmósfera cercana y cálida — donde el deporte, la conexión y el bienestar trascienden generaciones.',
      esencia_badge_n:'+19', esencia_badge_t:'canchas de pádel, tenis y pickleball',
      serv_eyebrow:'Lo que te espera', serv_title:'Tres formas de vivir Bahía',
      serv_sub:'Cada espacio del club está diseñado para moverte, conectar y relajarte.',
      s1_t:'Deporte', s1_a:'8 canchas de pádel', s1_b:'Tenis en arcilla y firme', s1_c:'8 canchas de pickleball', s1_d:'Gimnasio y fitness funcional',
      s2_t:'Experiencias Sociales', s2_a:'Restaurante y bar', s2_b:'Palapas y áreas familiares', s2_c:'Espacios exclusivos para niños', s2_d:'Lujo accesible y cálido',
      s3_t:'Bienestar', s3_a:'Alberca al aire libre', s3_b:'Vapor y relajación', s3_c:'Vestidores premium', s3_d:'Conexión con la naturaleza',
      nat_eyebrow:'Nuestro diferenciador',
      nat_title:'Un club que vive con la naturaleza.',
      nat_p:'En el predio de Bahía corren ríos naturales habitados por cocodrilos, tortugas y garzas. Un entorno vivo que ningún otro club ofrece, y que convierte cada visita en una experiencia entre el deporte y lo salvaje.',
      f1_t:'Cocodrilos', f2_t:'Tortugas', f3_t:'Garzas',
      f_sub:'en el predio', f_sub2:'vida silvestre', f_sub3:'entre los ríos',
      gal_eyebrow:'Galería', gal_title:'El ambiente Bahía',
      gal_link:'Ver instalaciones',
      planes_eyebrow:'Membresías', planes_title:'Elige tu forma de pertenecer',
      planes_sub:'Membresías temporales y permanentes, para locales y visitantes. Toca un plan para verlo a detalle.',
      bill_month:'Mensualidad', bill_signup:'Inscripción',
      plan_tag:'Más elegido', per_month:'/mes', per_once:' única vez',
      signup_lbl:'Inscripción', month_lbl:'Mensualidad', plan_cta:'Me interesa',
      p_fam:'Familiar', p_fam_who:'2 adultos + hasta 3 hijos menores de 28 años',
      p_par:'Pareja', p_par_who:'2 adultos',
      p_ind:'Individual', p_ind_who:'1 adulto',
      p_gym:'Solo Gym', p_gym_who:'1 adulto · acceso a gym, vestidores y alberca',
      perk_raqueta:'Pádel, tenis y pickleball', perk_gym:'Gimnasio y fitness funcional',
      perk_alberca:'Alberca y vestidores premium', perk_social:'Restaurante, bar y áreas sociales',
      perk_ninos:'Espacios exclusivos para niños', perk_vest:'Vestidores premium',
      perk_alberca2:'Alberca al aire libre', perk_noraqueta:'Sin acceso a áreas de raqueta',
      cap1:'Canchas firme', cap2:'Alberca', cap3:'Pickleball', cap4:'Naturaleza', cap5:'Vestidores', cap6:'Tenis arcilla',
      visita_title:'Agenda tu visita',
      visita_p:'Conoce el club en persona. Te mostramos cada espacio y resolvemos todas tus dudas sobre membresías.',
      visita_cta1:'Agendar Visita', visita_cta2:'Escríbenos por WhatsApp',
      foot_tagline:'Club deportivo y social en Bahía de Banderas. Deporte, comunidad y bienestar en armonía con la naturaleza.',
      foot_explore:'Explorar', foot_contacto:'Contacto', foot_horario:'Visítanos',
      foot_dir:'Paseo de los Flamingos 38, Bahía de Banderas, Nayarit',
      foot_rights:'© 2025 Bahía Social Sports Club. Todos los derechos reservados.'
    },
    en:{
      nav_inicio:'Home', nav_inst:'Facilities', nav_act:'Activities', nav_amen:'Amenities', nav_planes:'Plans', nav_contacto:'Contact',
      nav_cta:'Book a Visit',
      act_eyebrow:'Activities', act_title:'Everything to get you moving',
      act_sub:'Racquet sport, strength and community — all in one place.',
      act_tenis_t:'Tennis', act_padel_t:'Padel', act_card_cta:'Explore',
      act_tenis_p:'Our iconic pink courts, in hard and clay surfaces. The visual and sporting heart of the club.',
      act_tenis_m1:'Hard court', act_tenis_m2:'Clay', act_cta:'Book a visit',
      act_pick_t:'Pickleball', act_pick_p:'8 professional courts for the fastest-growing sport — easy to learn, impossible to put down.',
      act_gym_t:'Gym', act_gym_p:'State-of-the-art equipment and functional fitness, with natural light and green views.',
      amen_eyebrow:'Amenities', amen_title:'Every detail, cared for',
      amen_sub:'Premium spaces for before and after every match.',
      amen_vest:'Locker rooms', amen_reg:'Showers', amen_rest:'Restaurant & Terrace',
      foot_cal:'Book your visit →',
      hero_tag:'Where sport, nature and the good life come together.',
      hero_cta1:'Book a Visit', hero_cta2:'Discover the club',
      scroll:'Scroll',
      esencia_eyebrow:'What is Bahía?',
      esencia_title:'A club to live in, not just to train.',
      esencia_p1:'We blend padel, tennis and pickleball with a gym, social areas and amenities designed to enrich every member’s lifestyle.',
      esencia_p2:'State-of-the-art facilities, impeccable service and a warm, close-knit atmosphere — where sport, connection and wellbeing span generations.',
      esencia_badge_n:'+19', esencia_badge_t:'padel, tennis & pickleball courts',
      serv_eyebrow:'What awaits you', serv_title:'Three ways to live Bahía',
      serv_sub:'Every space in the club is designed to move you, connect you and let you unwind.',
      s1_t:'Sport', s1_a:'8 padel courts', s1_b:'Clay & hard tennis courts', s1_c:'8 pickleball courts', s1_d:'Gym & functional fitness',
      s2_t:'Social Experiences', s2_a:'Restaurant & bar', s2_b:'Palapas & family areas', s2_c:'Exclusive kids’ spaces', s2_d:'Warm, accessible luxury',
      s3_t:'Wellness', s3_a:'Outdoor pool', s3_b:'Steam & relaxation', s3_c:'Premium locker rooms', s3_d:'Connection with nature',
      nat_eyebrow:'What sets us apart',
      nat_title:'A club that lives with nature.',
      nat_p:'Natural rivers run through the Bahía grounds, home to crocodiles, turtles and herons. A living environment no other club can offer, turning every visit into an experience between sport and the wild.',
      f1_t:'Crocodiles', f2_t:'Turtles', f3_t:'Herons',
      f_sub:'on the grounds', f_sub2:'wildlife', f_sub3:'among the rivers',
      gal_eyebrow:'Gallery', gal_title:'The Bahía atmosphere',
      gal_link:'View facilities',
      planes_eyebrow:'Memberships', planes_title:'Choose how you belong',
      planes_sub:'Temporary and permanent memberships, for locals and visitors. Tap a plan to see the details.',
      bill_month:'Monthly', bill_signup:'Registration',
      plan_tag:'Most chosen', per_month:'/mo', per_once:' one-time',
      signup_lbl:'Registration', month_lbl:'Monthly', plan_cta:'I’m interested',
      p_fam:'Family', p_fam_who:'2 adults + up to 3 children under 28',
      p_par:'Couple', p_par_who:'2 adults',
      p_ind:'Individual', p_ind_who:'1 adult',
      p_gym:'Gym Only', p_gym_who:'1 adult · gym, lockers & pool access',
      perk_raqueta:'Padel, tennis & pickleball', perk_gym:'Gym & functional fitness',
      perk_alberca:'Pool & premium lockers', perk_social:'Restaurant, bar & social areas',
      perk_ninos:'Exclusive kids’ spaces', perk_vest:'Premium lockers',
      perk_alberca2:'Outdoor pool', perk_noraqueta:'No access to racquet areas',
      cap1:'Hard courts', cap2:'Pool', cap3:'Pickleball', cap4:'Nature', cap5:'Lockers', cap6:'Clay tennis',
      visita_title:'Book your visit',
      visita_p:'Get to know the club in person. We’ll show you every space and answer all your membership questions.',
      visita_cta1:'Book a Visit', visita_cta2:'Message us on WhatsApp',
      foot_tagline:'Sports and social club in Bahía de Banderas. Sport, community and wellbeing in harmony with nature.',
      foot_explore:'Explore', foot_contacto:'Contact', foot_horario:'Visit us',
      foot_dir:'Paseo de los Flamingos 38, Bahía de Banderas, Nayarit',
      foot_rights:'© 2025 Bahía Social Sports Club. All rights reserved.'
    }
  };


  /* ================================================================
     TYPEWRITER ON HERO TAG
     ================================================================ */
  function typewriter(el, text, speed){
    if(!el || reducedMotion){ el && (el.textContent = text); return; }
    el.textContent = '';
    var cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    el.appendChild(cursor);
    var i = 0;
    function type(){
      if(i < text.length){
        el.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
        setTimeout(type, speed + Math.random() * 30);
      }
    }
    setTimeout(type, 1400);
  }
  var heroTag = document.querySelector('.hero__tag');
  if(heroTag){
    var tagText = heroTag.textContent;
    typewriter(heroTag, tagText, 38);
  }

  /* ================================================================
     SCROLL VELOCITY BLUR
     ================================================================ */
  var lastY = 0, velTimer = null;
  var blurTargets = document.querySelectorAll('.hero__slides, .naturaleza__bg');
  blurTargets.forEach(function(el){ el.classList.add('velocity-blur'); });
  function checkVelocity(){
    var y = window.pageYOffset;
    var vel = Math.abs(y - lastY);
    lastY = y;
    if(vel > 18){
      blurTargets.forEach(function(el){ el.classList.add('blurring'); });
      clearTimeout(velTimer);
      velTimer = setTimeout(function(){
        blurTargets.forEach(function(el){ el.classList.remove('blurring'); });
      }, 120);
    }
  }
  window.addEventListener('scroll', checkVelocity, {passive:true});

  /* ================================================================
     PAGE LOADER — ballena cruza al ritmo de la carga real
     ================================================================ */
  var loader    = document.getElementById('pageLoader');
  var swimWhale = loader && loader.querySelector('.loader__swim-whale');
  var loadStart = Date.now();
  var pageReady = false;
  var FADE_AFTER_SWIM = 600; // ms después de terminar de cruzar antes de fade-out

  function hideLoader(){
    if(!loader) return;
    loader.classList.add('hidden');
    var hero = document.querySelector('.hero');
    if(hero) hero.classList.add('hero--loaded');
    // Nav entrada después del loader
    setTimeout(function(){
      if(nav) nav.classList.add('nav--visible');
    }, 100);
  }

  if(document.readyState === 'complete'){ setTimeout(hideLoader, 1800); }
  else { window.addEventListener('load', function(){ setTimeout(hideLoader, 1800); }); }


  /* ================================================================
     i18n
     ================================================================ */
  var currentLang = 'es';
  var currentBill = 'monthly';

  function applyLang(lang){
    var dict = i18n[lang] || i18n.es;
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      if(dict[key] !== undefined) el.textContent = dict[key];
    });
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang button').forEach(function(b){
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    currentLang = lang;
    updatePlans();
    positionPill();
    try{ localStorage.setItem('bahia_lang', lang); }catch(e){}
  }

  /* ================================================================
     PLANES
     ================================================================ */
  function updatePlans(){
    var dict = i18n[currentLang] || i18n.es;
    document.querySelectorAll('.plan').forEach(function(plan){
      var monthly = plan.getAttribute('data-monthly');
      var signup  = plan.getAttribute('data-signup');
      var numEl   = plan.querySelector('.num');
      var perEl   = plan.querySelector('.plan__per');
      var altEl   = plan.querySelector('.plan__alt');
      if(currentBill === 'monthly'){
        if(numEl) numEl.textContent = monthly;
        if(perEl) perEl.textContent = dict.per_month;
        if(altEl) altEl.textContent = dict.signup_lbl + ' $' + signup;
      } else {
        if(numEl) numEl.textContent = signup;
        if(perEl) perEl.textContent = dict.per_once;
        if(altEl) altEl.textContent = dict.month_lbl + ' $' + monthly + dict.per_month;
      }
    });
  }
  function positionPill(){
    var toggle = document.querySelector('.bill-toggle');
    if(!toggle) return;
    var pill   = toggle.querySelector('.bill-toggle__pill');
    var active = toggle.querySelector('button.active');
    if(pill && active){ pill.style.left = active.offsetLeft + 'px'; pill.style.width = active.offsetWidth + 'px'; }
  }

  /* ================================================================
     NAV + SCROLL PROGRESS + PARALLAX
     ================================================================ */
  var nav      = document.querySelector('.nav');
  var progress = document.querySelector('.scroll-progress');
  var sideNav  = document.querySelector('.side-nav');
  var scrollTopBtn = document.querySelector('.scroll-top');

  function onScroll(){
    var y = window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;

    nav.classList.toggle('nav--scrolled', y > 60);
    if(progress) progress.style.width = (h > 0 ? (y / h * 100) : 0) + '%';

    // scroll-to-top visibility
    if(scrollTopBtn) scrollTopBtn.classList.toggle('visible', y > 600);

    // parallax elements
    document.querySelectorAll('[data-parallax]').forEach(function(el){
      var speed = parseFloat(el.getAttribute('data-parallax'));
      var rect  = el.parentElement.getBoundingClientRect();
      var offset = (rect.top + rect.height / 2 - window.innerHeight / 2);
      el.style.transform = 'translate3d(0,' + (offset * speed) + 'px,0)';
    });

    // side nav active dot
    updateSideNav();

    // ball arc
    triggerBallArc(y);

    // hero title Apple-style shrink on scroll — reduce tamaño, sube, pero nunca desaparece
    var heroEl2 = document.querySelector('.hero');
    var heroTitleEl = document.querySelector('.hero__title');
    if(heroEl2 && heroTitleEl && !reducedMotion){
      var heroH = heroEl2.offsetHeight;
      var p = Math.min(y / (heroH * 0.6), 1);
      var scale   = 1 - p * 0.22;
      var moveUp  = p * -60;
      heroTitleEl.style.transform = 'scale(' + scale + ') translateY(' + moveUp + 'px)';
      heroTitleEl.style.opacity   = '1';
    }
  }
  window.addEventListener('scroll', onScroll, {passive:true});

  /* ================================================================
     SIDE NAV DOTS
     ================================================================ */
  var sections = [];
  var dots = [];

  function buildSideNav(){
    if(!sideNav) return;
    var targets = document.querySelectorAll('[data-screen-label]');
    targets.forEach(function(sec){
      sections.push(sec);
      var dot = document.createElement('button');
      dot.className = 'side-nav__dot';
      dot.setAttribute('aria-label', sec.getAttribute('data-screen-label'));
      dot.setAttribute('data-label', sec.getAttribute('data-screen-label'));
      dot.addEventListener('click', function(){
        sec.scrollIntoView({behavior:'smooth', block:'start'});
      });
      dots.push(dot);
      sideNav.appendChild(dot);
    });
  }

  function updateSideNav(){
    var mid = window.innerHeight / 2;
    var active = 0;
    sections.forEach(function(sec, i){
      var r = sec.getBoundingClientRect();
      if(r.top <= mid) active = i;
    });
    dots.forEach(function(d, i){ d.classList.toggle('active', i === active); });

    // switch dot color based on bg
    var activeSec = sections[active];
    if(activeSec){
      var bg = window.getComputedStyle(activeSec).backgroundColor;
      var dark = bg && (bg.indexOf('35, 42') > -1 || bg.indexOf('55, 81') > -1 || bg.indexOf('43, 63') > -1);
      sideNav.classList.toggle('side-nav--dark', !dark);
    }
  }

  buildSideNav();

  /* ================================================================
     SCROLL TO TOP
     ================================================================ */
  if(scrollTopBtn){
    scrollTopBtn.addEventListener('click', function(){
      window.scrollTo({top:0, behavior:'smooth'});
    });
  }

  /* ================================================================
     WORD-BY-WORD SPRING REVEAL
     ================================================================ */
  function splitWords(selector){
    if(reducedMotion) return;
    document.querySelectorAll(selector).forEach(function(el){
      if(el.getAttribute('data-split')) return;
      var text = el.textContent;
      var words = text.split(/(\s+)/);
      el.innerHTML = '';
      words.forEach(function(chunk){
        if(/^\s+$/.test(chunk)){ el.appendChild(document.createTextNode(chunk)); return; }
        var wrap = document.createElement('span'); wrap.className = 'word-wrap';
        var inner = document.createElement('span'); inner.className = 'word';
        inner.textContent = chunk;
        wrap.appendChild(inner);
        el.appendChild(wrap);
      });
      el.setAttribute('data-split','true');
    });
  }
  splitWords('.section-title');
  splitWords('.visita h2');
  splitWords('.naturaleza h2');

  /* ================================================================
     COUNTER ANIMATION
     ================================================================ */
  function easeOutExpo(t){ return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function animateCounter(el, from, to, duration, prefix, suffix){
    if(!el || reducedMotion){ if(el) el.textContent = (prefix||'') + to + (suffix||''); return; }
    var start = null;
    (function step(ts){
      if(!start) start = ts;
      var p   = Math.min((ts - start) / duration, 1);
      var val = Math.round(from + (to - from) * easeOutExpo(p));
      el.textContent = (p >= 0.98 ? (prefix||'') : '') + val + (suffix||'');
      if(p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  /* ================================================================
     INTERSECTION OBSERVER — reveals + counters + court lines + fauna
     ================================================================ */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var t = e.target;

      if(t.classList.contains('court-divider')){
        t.classList.add('in'); io.unobserve(t); return;
      }

      if(t.classList.contains('esencia__badge') && !t.classList.contains('counted')){
        t.classList.add('counted');
        animateCounter(t.querySelector('strong'), 0, 19, 1400, '+', '');
        io.unobserve(t); return;
      }

      if(t.classList.contains('fauna')){
        t.querySelectorAll('div').forEach(function(d){ d.classList.add('in'); });
        io.unobserve(t); return;
      }

      t.classList.add('in');
      var words = t.querySelectorAll('.word');
      words.forEach(function(w, i){ setTimeout(function(){ w.classList.add('in'); }, i * 38); });
      io.unobserve(t);
    });
  }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});

  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  document.querySelectorAll('.court-divider').forEach(function(el){ io.observe(el); });
  var badge = document.querySelector('.esencia__badge');
  if(badge) io.observe(badge);
  var fauna = document.querySelector('.fauna');
  if(fauna) io.observe(fauna);

  /* Stats section counters */
  var statsIO = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var num = e.target;
      var target = parseInt(num.getAttribute('data-target'), 10);
      var suffix = num.getAttribute('data-suffix') || '';
      animateCounter(num, 0, target, 1200, '', suffix);
      statsIO.unobserve(num);
    });
  }, {threshold:0.5});
  document.querySelectorAll('.stat__num').forEach(function(el){ statsIO.observe(el); });

  /* esencia copy lead accent bar */
  var esenciaCopy = document.querySelector('.esencia__copy');
  if(esenciaCopy){
    var esIO = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); esIO.unobserve(e.target); } });
    }, {threshold:0.2});
    esIO.observe(esenciaCopy);
  }

  /* naturaleza section slide-in from left */
  var natIO = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in-view'); natIO.unobserve(e.target); }
    });
  }, {threshold:0.15});
  var natSec = document.querySelector('.naturaleza');
  if(natSec) natIO.observe(natSec);

  /* ================================================================
     MOUSE PARALLAX ON HERO
     ================================================================ */
  var hero = document.querySelector('.hero');
  if(hero && !reducedMotion && window.matchMedia('(hover:hover)').matches){
    var heroWhale = hero.querySelector('.hero__whale');
    var heroTitle = hero.querySelector('.hero__title');
    var heroSub   = hero.querySelector('.hero__sub');
    var heroRule  = hero.querySelector('.hero__rule');
    var mx = 0, my = 0;
    var wx = 0, wy = 0, ttx = 0, tty = 0, sx = 0, sy = 0;

    hero.addEventListener('mousemove', function(e){
      var r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      my = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    });
    hero.addEventListener('mouseleave', function(){ mx = 0; my = 0; });

    (function heroLoop(){
      var lerp = 0.07;
      wx += (mx * 22 - wx) * lerp;
      wy += (my * 16 - wy) * lerp;
      ttx += (mx * 11 - ttx) * lerp;
      tty += (my *  8 - tty) * lerp;
      sx  += (mx *  6 - sx)  * lerp;
      sy  += (my *  4 - sy)  * lerp;
      if(heroWhale) heroWhale.style.transform = 'translate(' + wx + 'px,' + wy + 'px)';
      if(heroTitle) heroTitle.style.transform  = 'translate(' + ttx + 'px,' + tty + 'px)';
      if(heroSub)   heroSub.style.transform    = 'translate(' + sx + 'px,' + sy + 'px)';
      if(heroRule)  heroRule.style.transform   = 'translate(' + (sx*.5) + 'px,' + (sy*.5) + 'px)';
      requestAnimationFrame(heroLoop);
    })();
  }

  /* ================================================================
     3D TILT ON PLAN CARDS
     ================================================================ */
  if(!reducedMotion){
    document.querySelectorAll('.plan').forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r   = card.getBoundingClientRect();
        var x   = (e.clientX - r.left) / r.width  - 0.5;
        var y   = (e.clientY - r.top)  / r.height - 0.5;
        card.style.transform = 'translateY(-8px) rotateY(' + (x * 12) + 'deg) rotateX(' + (-y * 10) + 'deg) scale(1.02)';
        card.style.transition = 'box-shadow .3s, border-color .3s';
      });
      card.addEventListener('mouseleave', function(){
        card.style.transform = '';
        card.style.transition = 'transform .6s var(--ease-spring), box-shadow .45s var(--ease), border-color .45s var(--ease)';
      });
      card.addEventListener('mouseenter', function(){
        card.style.transition = 'box-shadow .3s, border-color .3s';
      });
    });
  }

  /* ================================================================
     MAGNETIC BUTTONS
     ================================================================ */
  if(!reducedMotion && window.matchMedia('(hover:hover)').matches){
    document.querySelectorAll('.btn--primary, .btn--ghost').forEach(function(btn){
      btn.addEventListener('mousemove', function(e){
        var r  = btn.getBoundingClientRect();
        var x  = (e.clientX - r.left - r.width  / 2) * 0.25;
        var y  = (e.clientY - r.top  - r.height / 2) * 0.25;
        btn.style.transform = 'translate(' + x + 'px,' + y + 'px) translateY(-2px)';
        btn.style.transition = 'transform .15s';
      });
      btn.addEventListener('mouseleave', function(){
        btn.style.transform = '';
        btn.style.transition = 'transform .5s var(--ease-spring), background .35s, color .35s, box-shadow .35s';
      });
    });
  }

  /* ================================================================
     RIPPLE ON BUTTONS
     ================================================================ */
  document.querySelectorAll('.btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      var r    = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var rip  = document.createElement('span');
      rip.className = 'ripple';
      rip.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size/2) + 'px;top:' + (e.clientY - r.top - size/2) + 'px;';
      btn.appendChild(rip);
      setTimeout(function(){ rip.remove(); }, 700);
    });
  });

  /* ================================================================
     BALL ARC ON FIRST SCROLL PAST HERO
     ================================================================ */
  var ballArcFired = false;
  function triggerBallArc(y){
    if(ballArcFired || reducedMotion) return;
    var heroEl = document.querySelector('.hero');
    if(!heroEl || y < heroEl.offsetHeight * 0.55) return;
    ballArcFired = true;
    var arc  = document.getElementById('ballArc');
    if(!arc) return;
    arc.classList.add('visible');
    var ball = arc.querySelector('.ball-arc__ball');
    var path = arc.querySelector('.ball-arc__path');
    if(!ball || !path) return;
    var len  = path.getTotalLength ? path.getTotalLength() : 800;
    var dur  = 1000; var start = null;
    function ease(t){ return t<.5 ? 2*t*t : -1+(4-2*t)*t; }
    (function animBall(ts){
      if(!start) start = ts;
      var p  = Math.min((ts - start) / dur, 1);
      var pt = path.getPointAtLength(ease(p) * len);
      ball.style.left    = pt.x + 'px';
      ball.style.top     = pt.y + 'px';
      ball.style.opacity = p < 0.1 ? p * 10 : p > 0.85 ? (1 - p) / 0.15 : 1;
      if(p < 1){ requestAnimationFrame(animBall); }
      else { setTimeout(function(){ arc.classList.remove('visible'); }, 200); }
    })(performance.now());
  }

  /* ================================================================
     MOBILE MENU
     ================================================================ */
  var burger = document.querySelector('.hamburger');
  if(burger){
    burger.addEventListener('click', function(){ document.body.classList.toggle('menu-open'); });
    document.querySelectorAll('.mobile-menu a').forEach(function(a){
      a.addEventListener('click', function(){ document.body.classList.remove('menu-open'); });
    });
  }

  /* ================================================================
     LANG TOGGLE
     ================================================================ */
  document.querySelectorAll('.lang button').forEach(function(b){
    b.addEventListener('click', function(){ applyLang(b.dataset.lang); });
  });

  /* ================================================================
     BILL TOGGLE (mensualidad/inscripción)
     ================================================================ */
  document.querySelectorAll('.bill-toggle button').forEach(function(b){
    b.addEventListener('click', function(){
      if(b.classList.contains('active')) return;
      document.querySelectorAll('.bill-toggle button').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      currentBill = b.dataset.bill;
      positionPill();
      document.querySelectorAll('.plan__amount').forEach(function(a){
        a.style.opacity   = '0';
        a.style.transform = 'translateY(6px)';
      });
      setTimeout(function(){
        updatePlans();
        document.querySelectorAll('.plan__amount').forEach(function(a){
          a.style.opacity   = '1';
          a.style.transform = 'none';
        });
      }, 180);
    });
  });
  document.querySelectorAll('.plan__amount').forEach(function(a){
    a.style.transition = 'opacity .25s var(--ease), transform .25s var(--ease)';
  });
  window.addEventListener('resize', positionPill);

  /* ================================================================
     PLAN CARD SELECTION
     ================================================================ */
  document.querySelectorAll('.plan').forEach(function(plan){
    plan.addEventListener('click', function(e){
      if(e.target.closest('a')) return;
      document.querySelectorAll('.plan').forEach(function(p){ p.classList.remove('plan--active'); });
      plan.classList.add('plan--active');
    });
  });

  /* ================================================================
     HERO SLIDESHOW + COUNTER
     ================================================================ */
  var heroSlides = document.querySelectorAll('.hero__slide');
  var counterCur = document.querySelector('.hero__counter-cur');
  var counterTot = document.querySelector('.hero__counter-tot');
  if(counterTot) counterTot.textContent = String(heroSlides.length).padStart(2,'0');

  function updateCounter(i){
    if(!counterCur) return;
    counterCur.style.opacity = '0';
    counterCur.style.transform = 'translateY(-8px)';
    setTimeout(function(){
      counterCur.textContent = String(i+1).padStart(2,'0');
      counterCur.style.opacity = '1';
      counterCur.style.transform = 'none';
    }, 200);
  }
  if(counterCur){
    counterCur.style.transition = 'opacity .25s var(--ease), transform .25s var(--ease)';
  }

  if(heroSlides.length > 1 && !reducedMotion){
    var hi = 0;
    setInterval(function(){
      heroSlides[hi].classList.remove('is-active');
      hi = (hi + 1) % heroSlides.length;
      heroSlides[hi].classList.add('is-active');
      updateCounter(hi);
    }, 5500);
  }

  /* ================================================================
     STICKY TOUR
     ================================================================ */
  var tourItems = document.querySelectorAll('.sticky-tour__item');
  var tourImgs  = document.querySelectorAll('.sticky-tour__img');
  var tourFill  = document.querySelector('.sticky-tour__progress-fill');

  if(tourItems.length && !reducedMotion){
    var tourIO = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        var idx = parseInt(e.target.getAttribute('data-tour-img'), 10);
        tourItems.forEach(function(it){ it.classList.remove('is-active'); });
        tourImgs.forEach(function(im){ im.classList.remove('is-active'); });
        e.target.classList.add('is-active');
        if(tourImgs[idx]) tourImgs[idx].classList.add('is-active');
        if(tourFill) tourFill.style.width = ((idx + 1) / tourImgs.length * 100) + '%';
      });
    }, {threshold:0.72, rootMargin:'0px 0px -15% 0px'});
    tourItems.forEach(function(item){ tourIO.observe(item); });
  }

  /* ================================================================
     MASONRY GALLERY — click opens modal
     ================================================================ */
  document.querySelectorAll('.masonry-item[data-gallery]').forEach(function(item){
    item.addEventListener('click', function(){
      var src   = item.getAttribute('data-gallery');
      var title = item.getAttribute('data-title') || '';
      if(!gModal) return;
      gGrid.innerHTML = '';
      gTitle.textContent = title;
      var im = document.createElement('img');
      im.src = src; im.alt = title; im.loading = 'lazy';
      im.style.cssText = 'width:100%;height:auto;border-radius:8px;';
      gGrid.appendChild(im);
      document.body.classList.add('gallery-open');
      gModal.setAttribute('aria-hidden','false');
    });
  });

  /* ================================================================
     CONTACT FORM
     ================================================================ */
  var cform = document.querySelector('.cform');
  if(cform){
    cform.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = cform.querySelector('.cform__submit');
      btn.textContent = 'Enviando…';
      btn.disabled = true;

      var data = new FormData(cform);
      fetch('https://formspree.io/f/xpwzgnjp', {
        method:'POST', body:data, headers:{'Accept':'application/json'}
      }).then(function(r){
        if(r.ok){
          cform.classList.add('cform--sent');
        } else {
          btn.textContent = 'Error — intenta de nuevo';
          btn.disabled = false;
        }
      }).catch(function(){
        /* fallback: mailto */
        var nombre = data.get('nombre') || '';
        var email  = data.get('email')  || '';
        var plan   = data.get('plan')   || '';
        var msg    = data.get('mensaje')|| '';
        window.location.href = 'mailto:membresias@bahiaclub.mx'
          + '?subject=Interesado%20en%20membresía%20' + encodeURIComponent(plan)
          + '&body=' + encodeURIComponent('Nombre: '+nombre+'\nEmail: '+email+'\n\n'+msg);
        cform.classList.add('cform--sent');
      });
    });
  }

  /* ================================================================
     GALLERY MODAL
     ================================================================ */
  var gModal = document.getElementById('galleryModal');
  if(gModal){
    var gGrid  = gModal.querySelector('.gallery-modal__grid');
    var gTitle = gModal.querySelector('.gallery-modal__title');
    function openGallery(btn){
      var raw  = btn.getAttribute('data-gallery') || '';
      var imgs = raw.split('|').filter(function(s){ return s.trim() !== ''; });
      gTitle.textContent = btn.getAttribute('data-title') || '';
      gGrid.innerHTML = '';
      if(imgs.length){
        imgs.forEach(function(src){
          var im = document.createElement('img');
          im.src = src; im.alt = btn.getAttribute('data-title') || ''; im.loading = 'lazy';
          gGrid.appendChild(im);
        });
      } else {
        var p = document.createElement('p');
        p.className = 'gallery-modal__empty';
        p.textContent = currentLang === 'en' ? 'Photos coming soon' : 'Fotos próximamente';
        gGrid.appendChild(p);
      }
      document.body.classList.add('gallery-open');
      gModal.setAttribute('aria-hidden', 'false');
    }
    function closeGallery(){
      document.body.classList.remove('gallery-open');
      gModal.setAttribute('aria-hidden', 'true');
    }
    document.querySelectorAll('[data-gallery]').forEach(function(btn){
      btn.addEventListener('click', function(){ openGallery(btn); });
    });
    gModal.querySelector('.gallery-modal__close').addEventListener('click', closeGallery);
    gModal.addEventListener('click', function(e){ if(e.target === gModal) closeGallery(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeGallery(); });
  }

  /* ================================================================
     UN DÍA EN BAHÍA — stagger timeline items
     ================================================================ */
  var diaIO = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      e.target.classList.add('in');
      diaIO.unobserve(e.target);
    });
  }, {threshold:0.35});
  document.querySelectorAll('.dia-bahia__item').forEach(function(el){ diaIO.observe(el); });

  /* ================================================================
     PLAN COMPARADOR — animate checkmarks on scroll
     ================================================================ */
  var compareEl = document.querySelector('.plan-compare');
  if(compareEl){
    var compareIO = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        e.target.classList.add('animated');
        compareIO.unobserve(e.target);
      });
    }, {threshold:0.3});
    compareIO.observe(compareEl);
  }

  /* ================================================================
     ACTIVE NAV LINK ON SCROLL
     ================================================================ */
  var navLinks = document.querySelectorAll('.nav__link[href^="#"]');
  var navSections = Array.from(navLinks).map(function(l){
    var id = l.getAttribute('href').slice(1);
    return document.getElementById(id);
  });
  function updateActiveNav(){
    var y = window.pageYOffset + window.innerHeight * 0.35;
    var active = 0;
    navSections.forEach(function(sec, i){ if(sec && sec.offsetTop <= y) active = i; });
    navLinks.forEach(function(l, i){ l.classList.toggle('is-active', i === active); });
  }
  window.addEventListener('scroll', updateActiveNav, {passive:true});

  /* ================================================================
     LAZY IMAGE FADE-IN
     ================================================================ */
  var imgIO = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var img = e.target;
      if(img.complete){ img.classList.add('loaded'); }
      else { img.addEventListener('load', function(){ img.classList.add('loaded'); }, {once:true}); }
      imgIO.unobserve(img);
    });
  }, {rootMargin:'0px 0px 100px 0px'});
  document.querySelectorAll('.act-card__img img, .amen__tile img, .marquee__item img, .esencia__img').forEach(function(img){
    img.classList.add('lazy');
    imgIO.observe(img);
  });

  /* ================================================================
     SMOOTH ANCHOR SCROLL (offset para nav fija)
     ================================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href');
      if(id === '#') return;
      var target = document.querySelector(id);
      if(!target) return;
      e.preventDefault();
      var offset = target.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({top: offset, behavior:'smooth'});
    });
  });

  /* ================================================================
     INIT
     ================================================================ */
  var saved = 'es';
  try{ saved = localStorage.getItem('bahia_lang') || 'es'; }catch(e){}
  applyLang(saved);
  onScroll();

})();
