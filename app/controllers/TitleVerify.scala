package controllers

import play.api.libs.json.*

import lila.app.{ *, given }
import lila.common.Json.given
import lila.title.TitleRequest
import lila.core.id.{ TitleRequestId, CmsPageKey }

final class TitleVerify(env: Env, cmsC: => Cms, reportC: => report.Report) extends LilaController(env):

  private def api = env.title.api
  private def ui  = views.title.ui

  def index = Auth { _ ?=> me ?=>
    cmsC.orCreateOrNotFound(CmsPageKey("title-verify-index")): page =>
      api.getCurrent.flatMap:
        case Some(req) => Redirect(routes.TitleVerify.show(req.id))
        case None      => Ok.async(ui.index(page.title, views.site.page.pageContent(page)))
  }

  def form = Auth { _ ?=> _ ?=>
    Ok.async(ui.create(env.title.form.create))
  }

  def create = AuthBody { _ ?=> _ ?=>
    bindForm(env.title.form.create)(
      err => BadRequest.async(ui.create(err)),
      data =>
        api
          .create(data)
          .map: req =>
            Redirect(routes.TitleVerify.show(req.id))
    )
  }

  def show(id: TitleRequestId) = Auth { _ ?=> me ?=>
    Found(api.getForMe(id)): req =>
      if req.userId.is(me)
      then Ok.async(ui.edit(env.title.form.edit(req.data), req))
      else Ok.async(views.title.mod.show(req))
  }

  def update(id: TitleRequestId) = AuthBody { _ ?=> me ?=>
    Found(api.getForMe(id)): req =>
      bindForm(env.title.form.create)(
        err => BadRequest.async(ui.edit(err, req)),
        data =>
          api
            .update(req, data)
            .map: req =>
              val redir = Redirect(routes.TitleVerify.show(req.id))
              if req.status == TitleRequest.Status.building then redir
              else redir.flashSuccess
      )
  }

  def cancel(id: TitleRequestId) = Auth { _ ?=> me ?=>
    Found(api.getForMe(id)): req =>
      api
        .delete(req)
        .inject:
          Redirect(routes.TitleVerify.index).flashSuccess
  }

  def image(id: TitleRequestId, tag: String) = AuthBody(parse.multipartFormData) { ctx ?=> me ?=>
    Found(api.getForMe(id)): req =>
      ctx.body.body.file("image") match
        case Some(image) =>
          limit.imageUpload(ctx.ip, rateLimited):
            api.image
              .upload(req, image, tag)
              .inject(Ok)
              .recover { case e: Exception =>
                BadRequest(e.getMessage)
              }
        case None => api.image.delete(req, tag) >> Ok
  }

  def queue = Secure(_.SetTitle) { ctx ?=> me ?=>
    for
      reqs              <- api.queue
      (scores, pending) <- reportC.getScores
      page              <- renderPage(views.title.queue(reqs, scores, pending))
    yield Ok(page)
  }
