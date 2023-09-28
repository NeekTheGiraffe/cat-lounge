const collapsibleElements = document.getElementsByClassName("collapsible");

for (const el of collapsibleElements) {
  el.addEventListener("click", () => {
    el.classList.toggle("active");
    const content = el.nextElementSibling;
    if (!(content instanceof HTMLElement)) {
      return;
    }
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  });
}
