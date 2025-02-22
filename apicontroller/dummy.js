<% 
const mainMenu = [
  { name: 'Dashboard', url: 'home/', icon: 'bi bi-grid' },
  { name: 'Attendance', url: 'attendance/', icon: 'bi bi-card-checklist' },
  { name: 'Student', url: 'student/', icon: 'bi bi-people' },
  { name: 'Warden', url: 'warden/', icon: 'bi bi-person-fill' },
  {
    name: 'Structure',
    icon: 'bi bi-layout-text-window-reverse',
    children: [
      { name: 'Block', url: 'block/' },
      { name: 'Block Floor', url: 'blockfloor/' },
      { name: 'Room', url: 'room/' },
    ],
  },
  {
    name: 'Others',
    icon: 'bi bi-grid-3x3-gap',
    children: [
      { name: 'Course', url: 'course/' },
    ],
  },
  { name: 'User', url: 'warden/details/', icon: 'bi bi-person' },
  { name: 'F.A.Q', url: 'faq/', icon: 'bi bi-question-circle' },
  { name: 'Contact', url: 'contact/', icon: 'bi bi-envelope' },
] %>

<aside id="sidebar" class="sidebar">
  <ul class="sidebar-nav" id="sidebar-nav">
    <% mainMenu.forEach(item => { %>
      <% if (item.name === 'User') { %>
        <li class="nav-heading">Pages</li>
      <% } %>
      <li class="nav-item">
        <% if (item.children) { 
          const isActiveParent = item.children.some(child => activeMenu === child.name.toLowerCase());
        %>
          <a class="nav-link <%= isActiveParent ? '' : 'collapsed' %>" 
             data-bs-target="#<%= item.name.toLowerCase().replace(/\s+/g, '-') %>-nav"
             data-bs-toggle="collapse" href="#">
            <i class="<%= item.icon %>"></i>
            <span><%= item.name %></span>
            <i class="bi bi-chevron-down ms-auto"></i>
          </a>
          <ul id="<%= item.name.toLowerCase().replace(/\s+/g, '-') %>-nav" class="nav-content collapse 
            <%= isActiveParent ? 'show' : '' %>" data-bs-parent="#sidebar-nav">
            <% item.children.forEach(child => { %>
              <li>
                <a href="<%= appURL + child.url %>" class="<%= activeMenu === child.name.toLowerCase() ? 'active' : '' %>">
                  <i class="bi bi-circle"></i>
                  <span><%= child.name %></span>
                </a>
              </li>
            <% }) %>
          </ul>
        <% } else { %>
          <a class="nav-link <%= activeMenu === item.name.toLowerCase() ? 'active' : 'collapsed' %>" 
             href="<%= appURL + item.url %>">
            <i class="<%= item.icon %>"></i>
            <span><%= item.name %></span>
          </a>
        <% } %>
      </li>
    <% }) %>
  </ul>
</aside>
