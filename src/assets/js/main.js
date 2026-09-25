
// Admin Dashboard dropdown Start
  document.querySelectorAll('.seller-toggle, .product-toggle').forEach(function(toggle){
    toggle.addEventListener('click', function() {
      const submenu = this.nextElementSibling;
      if(submenu.classList.contains('show')){
        submenu.classList.remove('show');
        this.querySelector('i').style.transform = 'rotate(0deg)';
      } else {
        submenu.classList.add('show');
        this.querySelector('i').style.transform = 'rotate(90deg)';
      }
    });
  });

  // Admin Dashboard dropdown End

// Admin Start Mobile Responsve




// Admin End Mobile Responsve


  // JS: Toggle chevron rotation
   // Dropdown open hone par chevron rotate
const dropdownBtn = document.getElementById('languageDropdown');
dropdownBtn.addEventListener('shown.bs.dropdown', function () {
    const chevron = this.querySelector('.chevron');
    chevron.classList.add('rotate'); // dropdown open
});

// Dropdown close hone par chevron wapas normal
dropdownBtn.addEventListener('hidden.bs.dropdown', function () {
    const chevron = this.querySelector('.chevron');
    chevron.classList.remove('rotate'); // dropdown close
});

// JS: Toggle chevron rotation




