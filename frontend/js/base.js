'use strict'

const isMobile = require('ismobilejs')

window.jQuery = window.$ = require('jquery')
require('jquery-match-height')

// Extensions
$.fn.watchFocusOut = function watchFocusOut() {
  var self = this

  function hasFocusWatcher() {
    var hasFocus = $(self).find(':focus').length > 0

    if (!hasFocus) {
      $('li.dropdown').removeClass('open')
    }
  }

  function handleFocusOut() {
    setTimeout(hasFocusWatcher, 10)
  }

  $(self).on('focusout', handleFocusOut)
}

// Handlers
function handleInputChange() {
  $(this).parent().removeClass('has-error')
}

$('ul.nav').watchFocusOut()

$('input, textarea, select').change(handleInputChange)

if (!isMobile.any) {
  $('.item').matchHeight()
  $(function delay() {
    $('.tab').click(function handleClick() {
      setTimeout($.fn.matchHeight._update, 1)
    })
  })

  window.addEventListener('resize', function handleWindowResize() {
    if (window.innerWidth < 768) {
      $('.item').matchHeight({remove: true})

      return
    }

    $.fn.matchHeight._update()
  })
}

// Search hooks
window.submitGlobalSearch = function(el) {
  const term = $('#search-field', el).val();
  window.location.replace(window.location.origin + '/search?q=' + term);
}