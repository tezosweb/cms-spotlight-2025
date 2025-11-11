// menu enhancements
const
  menu = document.getElementById('pagehead'),
  menuopener = document.getElementById('menu-open'),
  menuFirst = menu.querySelector('nav.menu details');

// close menu on body click
document.addEventListener('click', e => {

  const
    t = e.target.closest('#pagehead'),
    o = menu.querySelector('details[open]');

  setTimeout(() => {

    if (t) {

      // clicked inside header: ensure one menu is open
      if (menuopener.checked && !o) menuFirst.setAttribute('open', '');

    }
    else {

      // clicked outside header: close opener and open menu
      menuopener.checked = false;
      if (o) o.removeAttribute('open');

    }

  }, 10);

});
