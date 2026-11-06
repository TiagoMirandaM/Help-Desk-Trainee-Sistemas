from __future__ import annotations

from django.db import models
from django.db.models.functions import Lower
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField("nome", max_length=100)
    slug = models.SlugField("slug", max_length=120, unique=True, blank=True)
    is_active = models.BooleanField("ativa", default=True)
    created_at = models.DateTimeField("criada em", auto_now_add=True)

    class Meta:
        verbose_name = "categoria"
        verbose_name_plural = "categorias"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                name="category_name_ci_unique",
                violation_error_message="Já existe uma categoria com este nome.",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "categoria"
            slug = base
            suffix = 2
            while Category.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                slug = f"{base}-{suffix}"
                suffix += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name
