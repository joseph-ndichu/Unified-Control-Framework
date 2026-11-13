from django.contrib import admin
from django.urls import path

from ucf import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/session/", views.SessionView.as_view()),
    path("api/auth/register/", views.RegisterView.as_view()),
    path("api/auth/login/", views.LoginView.as_view()),
    path("api/auth/logout/", views.LogoutView.as_view()),
    path("api/meta/", views.MetaView.as_view()),
    path("api/dashboard/", views.DashboardView.as_view()),
    path("api/framework-controls/", views.FrameworkControlList.as_view()),
    path("api/framework-controls/<int:pk>/", views.FrameworkControlDetail.as_view()),
    path("api/unified-controls/", views.UnifiedControlList.as_view()),
    path("api/unified-controls/<int:pk>/", views.UnifiedControlDetail.as_view()),
    path("api/evidence/<int:pk>/", views.EvidenceDetail.as_view()),
]
