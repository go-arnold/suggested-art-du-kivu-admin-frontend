# Manques & écarts côté backend

> Audit de l'interface d'administration croisé avec la doc OpenAPI
> (`Art du Kivu API.yaml` / Swagger : `https://jeremy-backend.onrender.com/api/schema/swagger-ui/`).
> Objectif : lister ce qui **manque** ou **diffère** côté backend pour que le
> frontend soit pleinement fonctionnel.

Légende :
- 🔴 **Bloquant** — une fonctionnalité du frontend ne peut pas marcher.
- 🟠 **Écart de contrat** — le frontend doit s'adapter / un champ diffère.
- 🟡 **Infrastructure** — l'endpoint existe mais l'environnement pose problème.
- ⚪ **Disponible non utilisé** — le backend l'expose, le frontend ne l'utilise pas encore.

---

## 1. Endpoints manquants (à créer côté backend)

### Utilisateurs
| Manque | Impact frontend | 🔴/🟠 |
|--------|-----------------|:--:|
| **`POST /users/`** (création) | Le bouton **« Nouvel Utilisateur »** ne peut pas fonctionner. La seule création possible est `POST /auth/register/` (auto-inscription, avec vérification email). | 🔴 |
| **`DELETE /users/{id}/`** | Impossible de supprimer un utilisateur. | 🔴 |
| **Envoi d'email à un utilisateur** | L'action **« Envoyer un email »** n'a aucun endpoint. | 🔴 |

> Existant : `GET /users/`, `GET /users/{id}/`, `PATCH /users/{id}/` (utilisé pour activer/désactiver). « Voir le profil » et « Modifier » sont donc possibles côté API mais **pas encore câblés** dans le frontend.

### Notifications
| Manque | Impact | 🔴 |
|--------|--------|:--:|
| **Aucun endpoint de notifications** (`GET /notifications/`, marquer lu, etc.) | La cloche de la barre de navigation affiche des notifications **codées en dur** (badge « 3 »). Aucune donnée réelle. | 🔴 |

### Newsletter
| Manque | Impact | 🔴 |
|--------|--------|:--:|
| **Aucun modèle/endpoint « abonné newsletter »** | La page **Newsletter** réutilise `GET /users/?is_active=true` faute de mieux. Il n'y a pas de vraie liste d'abonnés. | 🔴 |
| **Aucun endpoint d'envoi de campagne** | Impossible d'envoyer une newsletter. | 🔴 |

### Recherche globale
| Manque | Impact | 🟠 |
|--------|--------|:--:|
| **Aucune recherche transversale** | La recherche de la barre de nav n'a pas d'endpoint global. Chaque liste a son `?search=` mais il n'existe pas de `/search/` multi-contenus. | 🟠 |

### Tableau de bord / statistiques
| Manque | Impact | 🟠 |
|--------|--------|:--:|
| **Pas d'analytics temporelles** (vues/jour, courbes) | La page **Statistiques** ne peut afficher que des **comptes agrégés** (en additionnant les `count` de plusieurs listes). Aucune série temporelle → les graphiques sont des placeholders. `GET /home/` n'expose que des stats sommaires. | 🟠 |

---

## 2. Écarts de contrat (champs / formats)

### Articles — `POST/PATCH /articles/`
Schéma : `ArticleWriteRequest`.
| Écart | Détail | 🟠 |
|-------|--------|:--:|
| **Pas de champ `author`** | Impossible d'assigner/réassigner l'auteur d'un article via l'API ; le backend force l'auteur = utilisateur connecté. Le sélecteur d'auteur du frontend est donc **purement visuel**. | 🟠 |
| **`tags` = `integer[]`** (IDs) | Le frontend saisit des tags en **texte libre**, mais l'API attend des **IDs de tags**. Il **manque un endpoint de tags** (`GET /articles/tags/` et/ou création) pour résoudre les libellés en IDs. Aujourd'hui les tags texte ne sont pas correctement enregistrés. | 🔴 |
| **`scheduled_at`** (et non `published_at`) | Pour la programmation, l'API attend `scheduled_at`. À aligner côté frontend. | 🟠 |
| **`featured_image` = `string`** | Type string (base64 attendu ?) — à confirmer : base64 ou multipart. | 🟠 |

### Événements — `POST/PATCH /events/`
| Écart | Détail | 🟠 |
|-------|--------|:--:|
| **`city` = `integer`** (ID) | Résolu côté frontend (Select via `GET /events/cities/`). | ✅ corrigé |
| **`image` = upload fichier** | Fonctionne en **multipart/form-data** (corrigé côté frontend). Le base64 JSON provoquait un 500. | ✅ corrigé |

### Podcasts — `POST/PATCH /podcasts/episodes/`
| Écart | Détail | 🟠 |
|-------|--------|:--:|
| **`published_at` requis** | Obligatoire à la création (corrigé côté frontend, défaut = maintenant). | ✅ corrigé |
| **Pas de champ `status`** | Le concept brouillon/publié pour un épisode n'existe pas côté backend. | 🟠 |
| **`cover` / `audio_file` = `string`** | Upload de la pochette / du fichier audio : format à clarifier (base64 vs multipart). Pas d'upload audio câblé. | 🟠 |

### Émissions Live — `PATCH /emissions/{slug}/`
| Écart | Détail | |
|-------|--------|:--:|
| **`status` writable** (live/scheduled/recorded/cancelled) | Démarrer/Arrêter une diffusion fonctionne via PATCH `status`. | ✅ corrigé |

### Artistes — `POST/PATCH /artists/`
| Écart | Détail | 🟠 |
|-------|--------|:--:|
| **`photo` / `cover_image` = `string`** | Le backend **accepte** la photo (champ string, base64/multipart à confirmer), mais le frontend **n'envoie pas encore** la photo uploadée. Gap **frontend**, pas backend. | 🟠 |
| **`genres` = `integer[]`** | Création possible avec des IDs de genres (`GET /artists/genres/`), non exposé dans le formulaire actuel. | ⚪ |

### Médiathèque (WebTV) — `POST/PATCH /webtv/videos/`
Schéma : `VideoWriteRequest`.
| Écart | Détail | 🔴 |
|-------|--------|:--:|
| **Pas d'upload de fichier vidéo** | Le champ est **`video_url` (URI)** — il faut fournir une **URL** de vidéo, pas un fichier. La zone « glisser un MP4 jusqu'à 100MB » est **incompatible** avec l'API. Il faudrait soit un endpoint d'upload de fichier (stockage S3/etc.), soit assumer le modèle « par URL ». | 🔴 |
| **`thumbnail` = `string`** | Format de la miniature à clarifier (base64/URL). | 🟠 |
| **Champs requis** : `category`, `published_at`, `title`, `video_url` | À respecter dans un futur dialog « Ajouter une vidéo par URL ». | 🟠 |

---

## 3. Problèmes d'infrastructure backend

| Problème | Impact | 🟡 |
|----------|--------|:--:|
| **Email de vérification non envoyé** | Après inscription, aucun email n'arrive → **impossible de se connecter** (« L'adresse email n'a pas été vérifiée »). SMTP non configuré (ou bloqué par l'offre d'hébergement). **Bloquant pour l'onboarding.** | 🔴🟡 |
| **Cold start Render (~10 s)** | L'offre gratuite endort le backend ; le premier appel est très lent. Donne une impression de lenteur générale. Envisager un plan payant ou un ping périodique. | 🟡 |
| **Expiration courte du token JWT** | L'access token expire vite (« Le type de jeton fourni n'est pas valide »). Géré côté frontend par un **refresh automatique**, mais penser à une durée d'access raisonnable. | 🟡 |
| **Google OAuth** | L'endpoint `POST /auth/google/` exige **`access_token` ou `code`** (PAS `id_token`). Nécessite une app Google configurée côté allauth, et le **Client ID** doit correspondre à celui du frontend. | 🟡 |
| **Erreurs 500 peu explicites** | Plusieurs validations renvoient `{"detail":"An unexpected error occurred.","code":"server_error"}` (HTTP 500) au lieu d'un 400 explicite (ex. image base64, token Google invalide). Difficile à diagnostiquer côté client. | 🟡 |

---

## 4. Endpoints exposés mais non utilisés par le frontend (⚪)

Le backend propose des modules **sans page d'admin** correspondante. Soit créer les écrans, soit confirmer qu'ils sont hors périmètre admin :

- **Communauté** : `/community/challenges/`, `/community/polls/` (+ vote), `/community/posts/` (+ like).
- **Radio** : `/radio/current/`, `/radio/program/`, `/radio/chat/`.
- **Sorties (Releases)** : `/releases/` (CRUD), `/releases/calendar/`, `/releases/featured/`.
- **Articles** : `/articles/{slug}/comments/` (modération de commentaires), `/articles/{slug}/like/`.
- **Artistes** : `/artists/{slug}/gallery/`, `/artists/{slug}/releases/`, `/artists/{slug}/videos/`.
- **Événements** : `/events/{slug}/register/` (inscriptions), `/events/featured/`.
- **Utilisateurs** : `/users/{id}/favorites/`, `/users/{id}/history/`.
- **Profil** : `PUT/PATCH /auth/me/` (édition de son propre profil).

---

## 5. Récapitulatif priorisé

### 🔴 À traiter en priorité côté backend
1. **Email de vérification** (SMTP) — bloque toute connexion après inscription.
2. **Endpoint de tags articles** (liste + création) — sinon les tags ne se sauvegardent pas.
3. **Upload de fichier vidéo** (ou décision « par URL » assumée).
4. **Gestion des utilisateurs** : `POST /users/` (création) + `DELETE /users/{id}/`.
5. **Notifications** : modèle + endpoints (la cloche est factice).
6. **Newsletter** : vrai modèle d'abonnés + envoi de campagne.

### 🟠 Écarts à clarifier / aligner
- `author` sur les articles (assignation d'auteur).
- `scheduled_at` (articles) vs `published_at`.
- Formats d'images : base64 vs multipart, harmonisés (`featured_image`, `thumbnail`, `cover`, `photo`).
- `status` des épisodes podcast (brouillon/publié).

### 🟡 Infrastructure
- Cold start / hébergement.
- Durée du token JWT.
- Config Google OAuth (Client ID partagé).
- Messages d'erreur 400 explicites au lieu de 500.

---
